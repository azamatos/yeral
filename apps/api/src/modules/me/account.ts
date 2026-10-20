/**
 * An account and its phone number: letting the account go (deleting it, book Q-172, or "Is this you?" answered "No",
 * Q-270), so whoever gets the number next finds nothing of the person's; and moving it to a new number (Q-171).
 */
import { epochOf, today } from '@yeral/domain/time'
import { and, eq, gte, inArray, isNull, or } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookingLinks, bookings, clientNotes, clients, invites, staff, users } from '../../db/schema'
import { ApiError } from '../../http/errors'
import type { User } from '../../http/env'
import { emit } from '../../notify'
import { linkPhone } from '../auth/sign-in'
import { pgCode, setStatus, StaleBooking } from '../bookings/repo'

/**
 * Invites to a number that's leaving its person (a deleted account, a changed phone): cancelled, so whoever gets the
 * number next can't accept them; the teams' screens hear it, and `userId`, the person, if their account stays.
 */
export async function cancelInvitesTo(db: Queryable, phone: string, at: Date, userId: string | null = null): Promise<string[]> {
  const dropped = await db
    .update(invites)
    .set({ status: 'cancelled', answeredAt: at })
    .where(and(eq(invites.phone, phone), eq(invites.status, 'pending')))
    .returning({ businessId: invites.businessId })
  const businessIds = [...new Set(dropped.map((d) => d.businessId))]
  for (const businessId of businessIds) await emit(db, { type: 'team.changed', businessId, userId })
  return businessIds
}

/**
 * The account goes: its team rows leave their teams (an owner can't go: `owns_workspace`), invites to its number are
 * cancelled, its bookings are left behind (they never join whoever signs in with the number next and send no more SMS)
 * and every link to the number stops working. `cancelAhead`: the bookings ahead are cancelled too (deletion); "Is this
 * you?" answered "No" leaves them for the business, without SMS.
 */
export async function releaseAccount(tx: Queryable, user: User, now: number, opts: { cancelAhead: boolean }): Promise<void> {
  // a workspace always has its one owner; the person's other rows leave their teams (ADR 0025)
  const rows = await tx.select().from(staff).where(eq(staff.userId, user.id)).for('update')
  if (rows.some((r) => r.level === 'owner' && r.status === 'active')) throw new ApiError('owns_workspace')
  await tx.update(staff).set({ status: 'removed', bookable: false }).where(eq(staff.userId, user.id))
  const invited = await cancelInvitesTo(tx, user.phone, new Date(now))
  for (const businessId of new Set(rows.map((r) => r.businessId)))
    if (!invited.includes(businessId)) await emit(tx, { type: 'team.changed', businessId })
  if (opts.cancelAhead) {
    const mine = await tx
      .select()
      .from(bookings)
      .where(and(eq(bookings.userId, user.id), eq(bookings.active, true)))
    // bookings before their move requests, the order every path locks them in; one the jobs settled meanwhile is done
    const ahead = mine.filter((x) => epochOf(x.date, x.start) > now).sort((x, y) => Number(!!x.rescheduleOf) - Number(!!y.rescheduleOf))
    for (const b of ahead) {
      try {
        const row = await setStatus(tx, b, { status: 'cancelled', cancelledBy: 'client', at: new Date(now) })
        await emit(tx, { type: 'booking.cancelled', businessId: row.businessId, bookingId: row.id, bookingCode: row.code })
      } catch (e) {
        if (!(e instanceof StaleBooking)) throw e
      }
    }
  }
  // their bookings are left behind: they never join whoever gets the number next and send no more SMS. Every link to
  // the number stops working, phone bookings made for it since the last sign-in too; those keep their SMS with new
  // links (book Q-168).
  await tx
    .update(bookings)
    .set({ accountDeletedAt: new Date(now) })
    .where(eq(bookings.userId, user.id))
  const toTheNumber = or(eq(bookings.userId, user.id), and(eq(bookings.clientPhone, user.phone), isNull(bookings.userId)))
  await tx.delete(bookingLinks).where(inArray(bookingLinks.bookingId, tx.select({ id: bookings.id }).from(bookings).where(toTheNumber)))
  await tx.delete(users).where(eq(users.id, user.id))
}

type ClientRow = typeof clients.$inferSelect

/**
 * The account takes a checked new number (book Q-171). Client records follow the account, so every business keeps
 * the person's history, no-show count and phone-only mark: a business that also keeps a record for the new number
 * has the two made into one. What businesses made for the new number joins the account as at a sign-in (Q-270). Team
 * rows that carried the old number take the new one; invites to the old number are cancelled, since it may pass to
 * someone else, and moving them would show the inviting business a number it was never given.
 */
export async function changePhone(tx: Queryable, user: User, phone: string, now: number): Promise<User> {
  const [row] = await tx
    .update(users)
    .set({ phone })
    .where(eq(users.id, user.id))
    .returning()
    .catch((e: unknown) => {
      // someone took the number between the check and the change
      if (pgCode(e) === '23505') throw new ApiError('phone_taken')
      throw e
    })
  if (!row) throw new ApiError('unauthorized')
  const mine = await tx.select().from(clients).where(eq(clients.userId, user.id)).for('update')
  const businessIds = [...new Set(mine.map((r) => r.businessId))]
  const atNew = businessIds.length
    ? await tx
        .select()
        .from(clients)
        .where(and(eq(clients.phone, phone), inArray(clients.businessId, businessIds)))
        .for('update')
    : []
  for (const businessId of businessIds) {
    const group = [...mine, ...atNew].filter((r) => r.businessId === businessId)
    // the record the person booked under keeps its id; the others' bookings and notes join it
    const kept = group.find((r) => r.phone === user.phone) ?? group[0]!
    const rest = group.filter((r) => r.id !== kept.id)
    if (rest.length) await mergeClients(tx, kept, rest)
    await tx.update(clients).set({ phone }).where(eq(clients.id, kept.id))
  }
  await linkPhone(tx, user.id, phone, now)
  // the bookings ahead reach the person at the new number; the past ones keep the number they were made with
  await tx
    .update(bookings)
    .set({ clientPhone: phone })
    .where(and(eq(bookings.userId, user.id), eq(bookings.active, true), gte(bookings.date, today(now))))
  const team = await tx
    .update(staff)
    .set({ phone })
    .where(and(eq(staff.userId, user.id), eq(staff.phone, user.phone)))
    .returning({ businessId: staff.businessId })
  const invited = await cancelInvitesTo(tx, user.phone, new Date(now), user.id)
  for (const businessId of new Set(team.map((t) => t.businessId)))
    if (!invited.includes(businessId)) await emit(tx, { type: 'team.changed', businessId, userId: user.id })
  return row
}

/**
 * One business's records of the same person made into `kept`: bookings and notes move over, and no mark the business
 * set is lost. The no-show count runs from the earlier restart, so no no-show either record still counted is dropped.
 */
async function mergeClients(tx: Queryable, kept: ClientRow, rest: ClientRow[]): Promise<void> {
  const ids = rest.map((r) => r.id)
  await tx.update(bookings).set({ clientId: kept.id }).where(inArray(bookings.clientId, ids))
  await tx.update(clientNotes).set({ clientId: kept.id }).where(inArray(clientNotes.clientId, ids))
  await tx.delete(clients).where(inArray(clients.id, ids))
  const all = [kept, ...rest]
  const since = all.map((r) => r.noShowsSince)
  await tx
    .update(clients)
    .set({
      name: all.find((r) => r.name)?.name ?? null,
      birthday: all.find((r) => r.birthday)?.birthday ?? null,
      tags: [...new Set(all.flatMap((r) => r.tags))],
      noRemindersSms: all.some((r) => r.noRemindersSms),
      onlineBlocked: all.some((r) => r.onlineBlocked),
      // never restarted (null) counts every no-show
      noShowsSince: since.some((d) => !d) ? null : new Date(Math.min(...since.map((d) => d!.getTime()))),
      createdAt: new Date(Math.min(...all.map((r) => r.createdAt.getTime()))),
    })
    .where(eq(clients.id, kept.id))
}

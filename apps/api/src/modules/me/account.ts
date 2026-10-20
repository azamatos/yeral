/**
 * An account and its phone number: letting the account go (deleting it, book Q-172, or "Is this you?" answered "No",
 * Q-270), so whoever gets the number next finds nothing of the person's; and moving it to a new number (Q-171).
 */
import { addDays, epochOf, today } from '@yeral/domain/time'
import { and, eq, gte, inArray, isNull, ne, or } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookingLinks, bookings, clientNotes, clients, invites, staff, users } from '../../db/schema'
import { ApiError } from '../../http/errors'
import type { User } from '../../http/env'
import { emit } from '../../notify'
import { DAY, linkPhone, SIX_MONTHS_DAYS } from '../auth/sign-in'
import { pgCode, setStatus, StaleBooking } from '../bookings/repo'
import { noShowsSinceReset } from '../clients/online'
import { teamChanged } from '../team/service'

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
  for (const businessId of businessIds) await teamChanged(db, businessId, { userId })
  return businessIds
}

/**
 * The account goes: its team rows leave their teams (an owner can't go: `owns_workspace`), and its bookings are left
 * behind: they never join whoever signs in with the number next and send no more SMS.
 *
 * `deleted` (book Q-172): the bookings ahead are cancelled, invites to the number too, and every link to the number
 * stops working, phone bookings made for it since the last sign-in included.
 *
 * `passedOn` ("Is this you?" answered "No", Q-270): the number is someone else's now. What was sent to it lately is
 * theirs and stays (invites, the links of phone bookings no account holds yet); the bookings ahead stay with the
 * business, without SMS; the businesses' records of the person keep their history but no longer go by the number, so
 * none joins the new holder or applies its marks to them.
 */
export async function releaseAccount(tx: Queryable, user: User, now: number, how: 'deleted' | 'passedOn'): Promise<void> {
  // a workspace always has its one owner; the person's other rows leave their teams (ADR 0025)
  const rows = await tx.select().from(staff).where(eq(staff.userId, user.id)).for('update')
  if (rows.some((r) => r.level === 'owner' && r.status === 'active')) throw new ApiError('owns_workspace')
  await tx.update(staff).set({ status: 'removed', bookable: false }).where(eq(staff.userId, user.id))
  const invited = how === 'deleted' ? await cancelInvitesTo(tx, user.phone, new Date(now)) : []
  for (const businessId of new Set(rows.map((r) => r.businessId))) if (!invited.includes(businessId)) await teamChanged(tx, businessId)
  if (how === 'deleted') {
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
  await tx
    .update(bookings)
    .set({ accountDeletedAt: new Date(now) })
    .where(eq(bookings.userId, user.id))
  // links to the number: phone bookings made for it since the last sign-in keep their SMS with new links (book Q-168)
  const linked =
    how === 'deleted'
      ? or(eq(bookings.userId, user.id), and(eq(bookings.clientPhone, user.phone), isNull(bookings.userId)))
      : eq(bookings.userId, user.id)
  await tx.delete(bookingLinks).where(inArray(bookingLinks.bookingId, tx.select({ id: bookings.id }).from(bookings).where(linked)))
  if (how === 'passedOn') await tx.update(clients).set({ phone: null }).where(eq(clients.userId, user.id))
  await tx.delete(users).where(eq(users.id, user.id))
}

type ClientRow = typeof clients.$inferSelect

/**
 * The account takes a checked new number (book Q-171). Client records follow the account, so every business keeps the
 * person's history, no-show count and phone-only mark. A business's record for the new number that's recent (Q-270) is
 * the person's too and the two become one; an older one is an earlier holder's: it keeps its history without the
 * number. What businesses made for either number lately joins the account, as at a sign-in. Team rows that carried the
 * old number take the new one (not rows of teams the person left); invites to the old number are cancelled, since it
 * may pass to someone else, and moving them would show the inviting business a number it was never given.
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
  // made for the old number since the last sign-in: the person's, so it moves with them
  await linkPhone(tx, user.id, user.phone, now)
  const mine = await tx.select().from(clients).where(eq(clients.userId, user.id)).for('update')
  const businessIds = [...new Set(mine.map((r) => r.businessId))]
  const atNew = businessIds.length
    ? await tx
        .select()
        .from(clients)
        .where(and(eq(clients.phone, phone), inArray(clients.businessId, businessIds)))
        .for('update')
    : []
  const recent = await recentRecords(tx, atNew, now)
  for (const businessId of businessIds) {
    const group = mine.filter((r) => r.businessId === businessId)
    // the record the person booked under keeps its id; the others' bookings and notes join it
    const kept = group.find((r) => r.phone === user.phone) ?? group[0]!
    const theirs = atNew.filter((r) => r.businessId === businessId && !group.some((g) => g.id === r.id))
    const same = theirs.filter((r) => (r.userId === null || r.userId === user.id) && recent.has(r.id))
    const earlier = theirs.filter((r) => !same.includes(r)).map((r) => r.id)
    if (earlier.length) await tx.update(clients).set({ phone: null }).where(inArray(clients.id, earlier))
    const rest = [...group.filter((r) => r.id !== kept.id), ...same]
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
    .where(and(eq(staff.userId, user.id), eq(staff.phone, user.phone), ne(staff.status, 'removed')))
    .returning({ businessId: staff.businessId })
  const invited = await cancelInvitesTo(tx, user.phone, new Date(now), user.id)
  for (const businessId of new Set(team.map((t) => t.businessId)))
    if (!invited.includes(businessId)) await teamChanged(tx, businessId, { userId: user.id })
  return row
}

/** Records made in the last 6 months, or holding a booking from them that no deleted account left (book Q-270). */
async function recentRecords(tx: Queryable, rows: ClientRow[], now: number): Promise<Set<string>> {
  const since = now - SIX_MONTHS_DAYS * DAY
  const older = rows.filter((r) => r.createdAt.getTime() < since).map((r) => r.id)
  const booked = older.length
    ? await tx
        .selectDistinct({ id: bookings.clientId })
        .from(bookings)
        .where(
          and(
            inArray(bookings.clientId, older),
            gte(bookings.date, addDays(today(now), -SIX_MONTHS_DAYS)),
            isNull(bookings.accountDeletedAt),
          ),
        )
    : []
  return new Set([...rows.filter((r) => r.createdAt.getTime() >= since).map((r) => r.id), ...booked.flatMap((b) => (b.id ? [b.id] : []))])
}

/**
 * One business's records of the same person made into `kept`: bookings and notes move over, and no mark the business
 * set is lost. The no-show count runs from the earliest restart of a record still counting no-shows, so none of those
 * is dropped; with none counting, from the latest restart, so none the business lifted comes back.
 */
async function mergeClients(tx: Queryable, kept: ClientRow, rest: ClientRow[]): Promise<void> {
  const all = [kept, ...rest]
  const counting: ClientRow[] = []
  for (const r of all) if ((await noShowsSinceReset(tx, r.id)) > 0) counting.push(r)
  const times = (rows: ClientRow[]) => rows.flatMap((r) => (r.noShowsSince ? [r.noShowsSince.getTime()] : []))
  const noShowsSince = counting.length
    ? counting.some((r) => !r.noShowsSince)
      ? null
      : new Date(Math.min(...times(counting)))
    : times(all).length
      ? new Date(Math.max(...times(all)))
      : null
  const ids = rest.map((r) => r.id)
  await tx.update(bookings).set({ clientId: kept.id }).where(inArray(bookings.clientId, ids))
  await tx.update(clientNotes).set({ clientId: kept.id }).where(inArray(clientNotes.clientId, ids))
  await tx.delete(clients).where(inArray(clients.id, ids))
  await tx
    .update(clients)
    .set({
      name: all.find((r) => r.name)?.name ?? null,
      birthday: all.find((r) => r.birthday)?.birthday ?? null,
      tags: [...new Set(all.flatMap((r) => r.tags))],
      noRemindersSms: all.some((r) => r.noRemindersSms),
      onlineBlocked: all.some((r) => r.onlineBlocked),
      noShowsSince,
      createdAt: new Date(Math.min(...all.map((r) => r.createdAt.getTime()))),
    })
    .where(eq(clients.id, kept.id))
}

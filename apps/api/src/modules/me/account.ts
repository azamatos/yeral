/**
 * An account and its phone number: letting the account go (deleting it, book Q-172, or "Is this you?" answered "No",
 * Q-270), and moving it to a new number (Q-171).
 */
import { epochOf, today } from '@yeral/domain/time'
import { and, desc, eq, gte, inArray, isNull, or, sql } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookingLinks, bookingRules, bookings, clientNotes, clients, invites, reviews, staff, users } from '../../db/schema'
import { ApiError } from '../../http/errors'
import type { User } from '../../http/env'
import { emit } from '../../notify'
import { linkPhone, recentRecord, unheldBooking } from '../auth/sign-in'
import { pgCode, setStatus, StaleBooking } from '../bookings/repo'
import { blockedByCount } from '../clients/online'
import { shiftRating, type StarShift } from '../reviews/rating'
import { teamChanged } from '../team/service'

/**
 * Invites to a number that's leaving its person (a deleted account, a changed phone): cancelled, so whoever gets the
 * number next can't accept them; the teams' screens hear it, and `userId`, the person, if their account stays.
 */
export async function cancelInvitesTo(
  db: Queryable,
  phone: string,
  at: Date,
  userId: string | null = null,
): Promise<{ businessId: string; staffId: string }[]> {
  const dropped = await db
    .update(invites)
    .set({ status: 'cancelled', answeredAt: at })
    .where(and(eq(invites.phone, phone), eq(invites.status, 'pending')))
    .returning({ businessId: invites.businessId, staffId: invites.staffId })
  for (const businessId of new Set(dropped.map((d) => d.businessId))) await teamChanged(db, businessId, { userId })
  return dropped
}

/**
 * The account goes: its team rows leave their teams (an owner can't go: `owns_workspace`) with any invite that brought
 * one back, and its bookings are left behind: they never join whoever signs in with the number next and send no more
 * SMS.
 *
 * `deleted` (book Q-172): the bookings ahead are cancelled, the reviews deleted, invites to the number cancelled, and
 * every link to the number stops working, phone bookings made for it since the last sign-in included. The businesses' records keep the number:
 * the person may well come back with it.
 *
 * `passedOn` ("Is this you?" answered "No", Q-270): the number is someone else's now. What was sent to it lately is
 * theirs and stays: invites to new rows, and phone bookings no account holds yet, with their links and a client record
 * of their own. The bookings ahead stay with the business, without SMS. The person's client records and team rows keep
 * their history without the number, so none joins the new holder, applies its marks to them or comes back for an invite
 * to the number.
 */
export async function releaseAccount(tx: Queryable, user: User, now: number, how: 'deleted' | 'passedOn'): Promise<void> {
  const at = new Date(now)
  // first: whatever the account is writing meanwhile (a review on another device) lands before this, or not at all
  await tx.select({ id: users.id }).from(users).where(eq(users.id, user.id)).for('update')
  // a workspace always has its one owner; the person's other rows leave their teams (ADR 0025)
  const rows = await tx.select().from(staff).where(eq(staff.userId, user.id)).for('update')
  if (rows.some((r) => r.level === 'owner' && r.status === 'active')) throw new ApiError('owns_workspace')
  await tx.update(staff).set({ status: 'removed', bookable: false }).where(eq(staff.userId, user.id))
  if (rows.length)
    await tx
      .update(invites)
      .set({ status: 'cancelled', answeredAt: at })
      .where(
        and(
          inArray(
            invites.staffId,
            rows.map((r) => r.id),
          ),
          eq(invites.status, 'pending'),
        ),
      )
  if (how === 'passedOn')
    await tx
      .update(staff)
      .set({ phone: null })
      .where(and(eq(staff.userId, user.id), eq(staff.hasApp, true)))
  const invited = how === 'deleted' ? (await cancelInvitesTo(tx, user.phone, at)).map((d) => d.businessId) : []
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
        const row = await setStatus(tx, b, { status: 'cancelled', cancelledBy: 'client', at })
        await emit(tx, { type: 'booking.cancelled', businessId: row.businessId, bookingId: row.id, bookingCode: row.code })
      } catch (e) {
        if (!(e instanceof StaleBooking)) throw e
      }
    }
    // the reviews go, and the businesses' ratings no longer count them (book Q-172); a number that passed on leaves the
    // earlier holder's reviews standing, signed as they were. One change per business, in one order, so two deletions
    // at once can't wait on each other
    const gone = await tx
      .delete(reviews)
      .where(eq(reviews.userId, user.id))
      .returning({ businessId: reviews.businessId, rating: reviews.rating })
    for (const businessId of [...new Set(gone.map((r) => r.businessId))].sort()) {
      const shift: StarShift = {}
      for (const r of gone) if (r.businessId === businessId) shift[r.rating] = (shift[r.rating] ?? 0) - 1
      await shiftRating(tx, businessId, shift)
      await emit(tx, { type: 'review.deleted', businessId })
    }
  }
  await tx.update(bookings).set({ accountDeletedAt: at }).where(eq(bookings.userId, user.id))
  // links to the number: phone bookings made for it since the last sign-in keep their SMS with new links (book Q-168)
  const linked =
    how === 'deleted'
      ? or(eq(bookings.userId, user.id), and(eq(bookings.clientPhone, user.phone), isNull(bookings.userId)))
      : eq(bookings.userId, user.id)
  await tx.delete(bookingLinks).where(inArray(bookingLinks.bookingId, tx.select({ id: bookings.id }).from(bookings).where(linked)))
  if (how === 'passedOn') await handOnRecords(tx, user, now)
  await tx.delete(users).where(eq(users.id, user.id))
}

/**
 * "No" (book Q-270): the person's client records lose the number. Phone bookings a business filed under one of them
 * for the number, that no account holds yet and the sign-in that follows links (upcoming or from the last 6 months),
 * are the new holder's: they move to a new record of the number at that business.
 */
async function handOnRecords(tx: Queryable, user: User, now: number): Promise<void> {
  const records = await tx
    .update(clients)
    .set({ phone: null })
    .where(eq(clients.userId, user.id))
    .returning({ id: clients.id, name: clients.name })
  if (!records.length) return
  const lately = await tx
    .select()
    .from(bookings)
    .where(
      and(
        inArray(
          bookings.clientId,
          records.map((r) => r.id),
        ),
        unheldBooking(user.phone, now),
      ),
    )
    .orderBy(desc(bookings.createdAt))
  for (const businessId of new Set(lately.map((b) => b.businessId))) {
    const theirs = lately.filter((b) => b.businessId === businessId)
    // unnamed: a name filed under the old record may well be the old holder's; the new holder's first booking names it
    const [record] = await tx.insert(clients).values({ businessId, phone: user.phone }).returning({ id: clients.id })
    await tx
      .update(bookings)
      .set({ clientId: record!.id })
      .where(
        inArray(
          bookings.id,
          theirs.map((b) => b.id),
        ),
      )
  }
}

type ClientRow = typeof clients.$inferSelect

/**
 * The account takes a checked new number (book Q-171). Client records follow the account, so every business keeps the
 * person's history, no-show count and phone-only mark. A business's record for the new number that's recent (Q-270) is
 * the person's too and the two become one; an older one is an earlier holder's: it keeps its history without the
 * number. What businesses made for either number lately joins the account, as at a sign-in. The person's active team
 * rows that carried the old number take the new one. Invites to the old number are cancelled, since it may pass to
 * someone else, and moving them would show a business a number it was never given; a row of the person's that such an
 * invite brought back is removed again, as it was before.
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
  // the business's records of the new number: none is the person's (they'd be in `mine`)
  const atNew = businessIds.length
    ? await tx
        .select({ record: clients, recent: sql<boolean>`${recentRecord(now)}` })
        .from(clients)
        .where(and(eq(clients.phone, phone), inArray(clients.businessId, businessIds)))
        .for('update')
    : []
  for (const businessId of businessIds) {
    const group = mine.filter((r) => r.businessId === businessId)
    // the record the person booked under keeps its id; the others' bookings and notes join it
    const kept = group.find((r) => r.phone === user.phone) ?? group[0]!
    const theirs = atNew.filter((r) => r.record.businessId === businessId)
    const same = theirs.filter((r) => r.record.userId === null && r.recent).map((r) => r.record)
    const earlier = theirs.filter((r) => !same.includes(r.record)).map((r) => r.record.id)
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
    .where(and(eq(staff.userId, user.id), eq(staff.phone, user.phone), eq(staff.status, 'active')))
    .returning({ businessId: staff.businessId })
  const dropped = await cancelInvitesTo(tx, user.phone, new Date(now), user.id)
  if (dropped.length)
    await tx
      .update(staff)
      .set({ status: 'removed', bookable: false })
      .where(
        and(
          inArray(
            staff.id,
            dropped.map((d) => d.staffId),
          ),
          eq(staff.userId, user.id),
          eq(staff.status, 'invited'),
        ),
      )
  const invited = dropped.map((d) => d.businessId)
  for (const businessId of new Set(team.map((t) => t.businessId)))
    if (!invited.includes(businessId)) await teamChanged(tx, businessId, { userId: user.id })
  return row
}

/**
 * One business's records of the same person made into `kept`: bookings and notes move over, and no mark the business
 * set is lost. A block the no-show count sets on any of them stays: the count runs from the earliest restart among
 * those. Otherwise it runs from the latest time the business lifted a block for any of them, so a fresh start it gave
 * stays given.
 */
async function mergeClients(tx: Queryable, kept: ClientRow, rest: ClientRow[]): Promise<void> {
  const all = [kept, ...rest]
  const [rules] = await tx
    .select({ blockAfterNoShows: bookingRules.blockAfterNoShows })
    .from(bookingRules)
    .where(eq(bookingRules.businessId, kept.businessId))
  const blocked = rules
    ? await blockedByCount(
        tx,
        all.map((r) => r.id),
        rules,
      )
    : new Set<string>()
  const restarts = (rows: ClientRow[]) => rows.flatMap((r) => (r.noShowsSince ? [r.noShowsSince.getTime()] : []))
  const counting = all.filter((r) => blocked.has(r.id))
  const noShowsSince = counting.length
    ? counting.some((r) => !r.noShowsSince)
      ? null
      : new Date(Math.min(...restarts(counting)))
    : restarts(all).length
      ? new Date(Math.max(...restarts(all)))
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

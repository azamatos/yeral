/**
 * Keeping the business's clients (book B-33–B-36): adding one by hand, the card's edit and switches, team notes and
 * deleting a client. The owner and administrators add, change and delete ("add / delete clients and Phone only"); a
 * note, anyone who sees the client (a specialist on their own). One client per number at a business (ADR 0018).
 */
import type { ClientExistsDetails, ClientHasBookingsDetails } from '@yeral/contract/errors'
import type { clientInputSchema, clientNoteInputSchema, clientUpdateSchema } from '@yeral/contract/clients'
import { scopeOf, type Actor } from '@yeral/domain/permissions'
import { today } from '@yeral/domain/time'
import { and, asc, eq, isNull, or } from 'drizzle-orm'
import type { z } from 'zod'
import type { Queryable } from '../../db/client'
import { bookings, clientNotes, clients } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError, invalid } from '../../http/errors'
import { emit } from '../../notify'
import { pgCode } from '../bookings/repo'
import { rulesOf } from '../settings/service'
import { accountFor } from '../auth/sign-in'
import { aheadAt, seenClient } from './facts'
import { setOnlineBlocked } from './online'

interface Business {
  id: string
  sandbox: boolean
}
type ClientInput = z.infer<typeof clientInputSchema>
type ClientUpdate = z.infer<typeof clientUpdateSchema>
type NoteInput = z.infer<typeof clientNoteInputSchema>

/** "add / delete clients and Phone only": the owner and administrators. */
function assertManages(actor: Actor): void {
  if (scopeOf(actor, 'clients') !== 'all') throw new ApiError('forbidden')
}

function assertBirthday(birthday: string | null | undefined, now: number): void {
  if (birthday && birthday > today(now)) throw invalid({ path: ['birthday'], code: 'in_future' })
}

/** The business's client holding this number, if any. */
async function holderOf(db: Queryable, businessId: string, phone: string): Promise<ClientExistsDetails | null> {
  const [held] = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(and(eq(clients.businessId, businessId), eq(clients.phone, phone)))
  return held ? { id: held.id, name: held.name } : null
}

/** Two saves for one number at once: the database refuses the second (`clients_business_phone`). */
class NumberTaken extends Error {}

const clientChanged = (db: Queryable, businessId: string) => emit(db, { type: 'client.updated', businessId })

/** "Täze müşderi" (B-33): only the number is needed; a note given is the team's first note. */
export async function addClient(deps: Deps, business: Business, actor: Actor, input: ClientInput): Promise<{ id: string }> {
  assertManages(actor)
  const now = deps.now()
  assertBirthday(input.birthday, now)
  return deps.db.transaction(async (tx) => {
    const [row] = await tx
      .insert(clients)
      .values({
        businessId: business.id,
        phone: input.phone,
        name: input.name ?? null,
        birthday: input.birthday ?? null,
        source: input.source ?? null,
        tags: input.tags,
        userId: (await accountFor(tx, business, input.phone, now))?.id ?? null,
        createdAt: new Date(now),
      })
      .onConflictDoNothing({ target: [clients.businessId, clients.phone] })
      .returning({ id: clients.id })
    // the conflict waited for the other save to commit, so its record is there to open
    if (!row) throw new ApiError('client_exists', (await holderOf(tx, business.id, input.phone)) ?? undefined)
    if (input.note)
      await tx
        .insert(clientNotes)
        .values({ clientId: row.id, text: input.note, alert: false, authorStaffId: actor.staffId, createdAt: new Date(now) })
    await clientChanged(tx, business.id)
    return row
  })
}

/** The business's client, held for the change; 404 for another business's or a gone one. */
async function lockedClient(db: Queryable, businessId: string, id: string) {
  const [row] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.businessId, businessId)))
    .for('update')
  if (!row) throw new ApiError('not_found')
  return row
}

/**
 * The card's edit and switches (B-34, B-35). A new name or number also goes on the bookings ahead the team made for
 * them without an account, which their SMS go to; an account's bookings keep what the account says. A new number
 * joins its holder's account, as a team's booking for it would.
 */
export async function updateClient(deps: Deps, business: Business, actor: Actor, id: string, change: ClientUpdate): Promise<void> {
  assertManages(actor)
  const now = deps.now()
  assertBirthday(change.birthday, now)
  try {
    await deps.db.transaction(async (tx) => {
      const c = await lockedClient(tx, business.id, id)
      const phone = change.phone !== undefined && change.phone !== c.phone ? change.phone : undefined
      if (phone && c.userId) throw new ApiError('client_phone_locked')
      if (phone) {
        const held = await holderOf(tx, business.id, phone)
        if (held) throw new ApiError('client_exists', held)
      }
      const set = Object.fromEntries(
        Object.entries({
          phone,
          userId: phone ? ((await accountFor(tx, business, phone, now))?.id ?? null) : undefined,
          name: change.name,
          // a name the team typed is theirs: a booking's undo no longer takes it back (B-24)
          nameSetBy: change.name !== undefined ? null : undefined,
          birthday: change.birthday,
          source: change.source,
          tags: change.tags,
          noRemindersSms: change.noReminders,
        }).filter(([, v]) => v !== undefined),
      )
      if (Object.keys(set).length)
        await tx
          .update(clients)
          .set(set)
          .where(eq(clients.id, c.id))
          .catch((e: unknown) => {
            throw pgCode(e) === '23505' ? new NumberTaken() : e
          })
      if (phone || change.name !== undefined)
        await tx
          .update(bookings)
          .set({ clientPhone: phone, clientName: change.name, updatedAt: new Date(now) })
          .where(and(eq(bookings.clientId, c.id), isNull(bookings.userId), aheadAt(now)))
      if (change.phoneOnly !== undefined) await setOnlineBlocked(tx, c.id, change.phoneOnly, await rulesOf(tx, business.id), new Date(now))
      await clientChanged(tx, business.id)
    })
  } catch (e) {
    // another save took the number between the check and the change
    if (e instanceof NumberTaken) throw new ApiError('client_exists', (await holderOf(deps.db, business.id, change.phone!)) ?? undefined)
    throw e
  }
}

/** "Bellik goş" (B-34): by anyone who sees the client; the author and the time go with it. */
export async function addNote(deps: Deps, business: Business, actor: Actor, id: string, input: NoteInput): Promise<{ id: string }> {
  const now = deps.now()
  return deps.db.transaction(async (tx) => {
    // held: a delete waits until the note is in
    await seenClient(tx, business.id, actor, id)
    const [row] = await tx
      .insert(clientNotes)
      .values({ clientId: id, text: input.text, alert: input.alert, authorStaffId: actor.staffId, createdAt: new Date(now) })
      .returning({ id: clientNotes.id })
    await clientChanged(tx, business.id)
    return row!
  })
}

/**
 * "Müşderini poz" (B-36): not while they have bookings ahead or waiting requests (Q-208; `details` lists them), a
 * request the jobs haven't settled yet included. The record and its notes go; their bookings stay for the numbers,
 * without the record, the name or the number, and one the client cancelled doesn't come back ("Yzyna al") without
 * them. A booking they make later starts a new record.
 */
export async function deleteClient(deps: Deps, business: Business, actor: Actor, id: string): Promise<void> {
  assertManages(actor)
  const now = deps.now()
  await deps.db.transaction(async (tx) => {
    const c = await lockedClient(tx, business.id, id)
    const ahead = await tx
      .select()
      .from(bookings)
      .where(and(eq(bookings.clientId, c.id), isNull(bookings.rescheduleOf), or(aheadAt(now), eq(bookings.status, 'pending'))))
      .orderBy(asc(bookings.date), asc(bookings.start))
    if (ahead.length) {
      const details: ClientHasBookingsDetails = {
        bookings: ahead.map((b) => ({
          code: b.code,
          date: b.date,
          start: b.start,
          end: b.end,
          status: b.status === 'pending' ? 'pending' : 'confirmed',
        })),
      }
      throw new ApiError('client_has_bookings', details)
    }
    await tx
      .update(bookings)
      .set({ clientId: null, clientName: null, clientPhone: null, updatedAt: new Date(now) })
      .where(eq(bookings.clientId, c.id))
    await tx.delete(clients).where(eq(clients.id, c.id))
    await clientChanged(tx, business.id)
  })
}

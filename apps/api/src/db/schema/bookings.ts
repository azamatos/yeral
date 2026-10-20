/**
 * Bookings of every type, their items, reviews, events and jobs (ADR 0017).
 *
 * Double booking is impossible at the database level: active booking items exclude each other per specialist
 * over `[start, end + buffer)` in absolute minutes (a day may run past midnight), and active table bookings per table
 * (exclusion constraints in the migrations, btree_gist).
 * Rows keep snapshots (client name and phone, service names, prices) so history survives edits and deletions.
 */
import type { DeclineReason, Localized } from '@yeral/domain/model'
import { sql } from 'drizzle-orm'
import { bigserial, boolean, date, index, integer, jsonb, pgTable, text, uniqueIndex, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { businesses, classSessions, clients, diningTables, services, staff, tableAreas } from './business'
import { bookingSource, bookingStatus, bookingType, cancelledBy, complaintType, declineReason, priceType } from './enums'
import { createdAt, int4range, ts, xid8 } from './types'

/** A move that wasn't accepted, kept on the booking it would have moved. */
export interface MoveRefused {
  date: string
  start: number
  end: number
  by: 'business' | 'system'
  reason: DeclineReason | null
  text: string | null
}

/** A time offered to the client (decline or expiry alternatives). */
export interface TimeSlot {
  date: string
  start: number
  end: number
  /** The one specialist it's booked with (book Q-159); absent on tables and on offers made before. */
  staffId?: string | null
}

export const bookings = pgTable(
  'bookings',
  {
    id: uuid().primaryKey().defaultRandom(),
    /** `YR-48213` */
    code: text().notNull().unique(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    type: bookingType().notNull(),
    clientId: uuid().references(() => clients.id, { onDelete: 'set null' }),
    userId: uuid().references(() => users.id, { onDelete: 'set null' }),
    /** Snapshots; blanked when the client is deleted ("atsyz"). */
    clientName: text(),
    clientPhone: text(),
    /** Business-local date and minutes. */
    date: date({ mode: 'string' }).notNull(),
    start: integer().notNull(),
    end: integer().notNull(),
    status: bookingStatus().notNull(),
    /** pending or confirmed: takes its slot. Computed by Postgres from `status`, so the no-overlap constraints can't drift. */
    active: boolean()
      .notNull()
      .generatedAlwaysAs(sql`"status" in ('pending', 'confirmed')`),
    cancelledBy: cancelledBy(),
    cancelReason: text(),
    declineReason: declineReason(),
    declineText: text(),
    declineAlternatives: jsonb().$type<TimeSlot[]>().notNull().default([]),
    expiredAlternatives: jsonb().$type<TimeSlot[]>().notNull().default([]),
    /**
     * The last move the business declined or let lapse, while this booking keeps its time (ROUND6 A3): set then, cleared
     * when another move is asked, one is accepted, or the client withdraws.
     */
    moveRefused: jsonb().$type<MoveRefused>(),
    /**
     * The person deleted their account: the booking never joins an account by its phone again (whoever gets the number
     * next mustn't see it) and sends no more SMS.
     */
    accountDeletedAt: ts(),
    complaintType: complaintType(),
    complaintText: text(),
    complaintAt: ts(),
    source: bookingSource().notNull(),
    clientNote: text(),
    /** Team only; autosaved in the booking drawer. */
    internalNote: text(),
    priceType: priceType(),
    priceAmount: integer(),
    /** Pending requests expire here (`@yeral/domain/lifecycle` holdUntil). */
    holdUntil: ts(),
    /** A client's move request points at the booking it would replace. */
    rescheduleOf: uuid().references((): AnyPgColumn => bookings.id, { onDelete: 'cascade' }),
    /** Made from a time offered after a decline or an expiry: one booking per offer (unique). */
    alternativeOf: uuid()
      .unique()
      .references((): AnyPgColumn => bookings.id, { onDelete: 'set null' }),
    /** Tell the client by SMS about changes made in the workspace (manual bookings). */
    notifyClient: boolean().notNull().default(true),
    // table
    partySize: integer(),
    areaId: uuid().references(() => tableAreas.id, { onDelete: 'set null' }),
    tableId: uuid().references(() => diningTables.id, { onDelete: 'set null' }),
    tableRequests: text().array().notNull().default([]),
    /** Absolute business-local minutes (days since 2000-01-01 × 1440 + minutes), so a day open past midnight overlaps the next one. */
    span: int4range().generatedAlwaysAs(
      sql`int4range(("date" - date '2000-01-01') * 1440 + "start", ("date" - date '2000-01-01') * 1440 + "end")`,
    ),
    // class
    sessionId: uuid().references(() => classSessions.id, { onDelete: 'set null' }),
    seats: integer(),
    createdAt: createdAt(),
    confirmedAt: ts(),
    /**
     * When the business answered this request (confirmed or declined it), for the typical answer time (book Q-113);
     * null for an instant booking, one never answered, and bookings from before it was kept.
     */
    answeredAt: ts(),
    cancelledAt: ts(),
    completedAt: ts(),
    updatedAt: ts().notNull().defaultNow(),
  },
  (t) => [
    index('bookings_business_date_idx').on(t.businessId, t.date),
    index('bookings_user_date_idx').on(t.userId, t.date),
    index('bookings_client_idx').on(t.clientId),
    index('bookings_due_idx').on(t.status, t.holdUntil),
    index('bookings_session_idx').on(t.sessionId),
    // the business page's typical answer time reads a month of answers (book Q-113)
    index('bookings_answered_idx')
      .on(t.businessId, t.answeredAt)
      .where(sql`${t.answeredAt} is not null`),
    // a move may overlap its booking's time (book Q-165), so the database keeps one waiting move per booking
    uniqueIndex('bookings_one_waiting_move')
      .on(t.rescheduleOf)
      .where(sql`${t.status} = 'pending'`),
  ],
)

/** Appointment services in order, each with its specialist; the buffer follows each specialist's run. */
export const bookingItems = pgTable(
  'booking_items',
  {
    id: uuid().primaryKey().defaultRandom(),
    bookingId: uuid()
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    serviceId: uuid().references(() => services.id, { onDelete: 'set null' }),
    staffId: uuid().references(() => staff.id, { onDelete: 'set null' }),
    serviceName: jsonb().$type<Localized>().notNull(),
    staffName: text(),
    date: date({ mode: 'string' }).notNull(),
    start: integer().notNull(),
    end: integer().notNull(),
    bufferAfter: integer().notNull().default(0),
    priceType: priceType().notNull(),
    priceAmount: integer().notNull(),
    /** Its booking's `active`, copied by a trigger (migration 0003) whenever either row changes. */
    active: boolean().notNull().default(false),
    /**
     * The booking whose time this is: a move request's items belong to the booking it would move, so the two may overlap
     * with the same specialist (book Q-165); everything else may not. Set by the same trigger (migration 0010).
     */
    family: uuid()
      .notNull()
      .default(sql`gen_random_uuid()`),
    /**
     * The specialist's account when the item was booked (their staff row's `userId`), set by the same trigger: one
     * person's items in different workspaces may not overlap either (busy elsewhere, book Q-272; migration 0020). Linking
     * a staff row to an account later leaves its earlier items as they were.
     */
    person: uuid(),
    /** Absolute business-local minutes, buffer included: an item late on one day and one early the next can collide. */
    span: int4range().generatedAlwaysAs(
      sql`int4range(("date" - date '2000-01-01') * 1440 + "start", ("date" - date '2000-01-01') * 1440 + "end" + "buffer_after")`,
    ),
    sort: integer().notNull().default(0),
  },
  (t) => [index('booking_items_booking_idx').on(t.bookingId), index('booking_items_staff_date_idx').on(t.staffId, t.date)],
)

/**
 * SMS links to one booking (book Q-168): a long random token on a path of its own, stored hashed, one per SMS. The
 * booking code is shown and read out on the phone but opens nothing by itself.
 */
export const bookingLinks = pgTable(
  'booking_links',
  {
    tokenHash: text().primaryKey(),
    bookingId: uuid()
      .notNull()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    /** The phone the SMS went to: the link works only while that is still the booking's phone (`bookingOfLink`). */
    sentTo: text().notNull(),
    createdAt: createdAt(),
    expiresAt: ts().notNull(),
  },
  (t) => [index('booking_links_booking_idx').on(t.bookingId)],
)

export const reviews = pgTable(
  'reviews',
  {
    id: uuid().primaryKey().defaultRandom(),
    bookingId: uuid()
      .notNull()
      .unique()
      .references(() => bookings.id, { onDelete: 'cascade' }),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    userId: uuid().references(() => users.id, { onDelete: 'set null' }),
    /** "Aýjemal G." */
    authorName: text().notNull(),
    rating: integer().notNull(),
    tags: text().array().notNull().default([]),
    text: text(),
    /** "Aýal saç kesimi · Aýna" */
    what: text().notNull().default(''),
    replyText: text(),
    replyAt: ts(),
    createdAt: createdAt(),
    updatedAt: ts().notNull().defaultNow(),
  },
  (t) => [index('reviews_business_idx').on(t.businessId, t.createdAt)],
)

/** One row per change; open screens poll them (`GET /v1/events`). */
export const events = pgTable(
  'events',
  {
    id: bigserial({ mode: 'number' }).primaryKey(),
    type: text().notNull(),
    at: ts().notNull().defaultNow(),
    businessId: uuid().references(() => businesses.id, { onDelete: 'cascade' }),
    bookingId: uuid().references(() => bookings.id, { onDelete: 'set null' }),
    bookingCode: text(),
    /** The client the event concerns. */
    userId: uuid().references(() => users.id, { onDelete: 'cascade' }),
    /** The writing transaction: pollers only read events older than every transaction still running. */
    txid: xid8()
      .notNull()
      .default(sql`pg_current_xact_id()`),
  },
  (t) => [index('events_business_idx').on(t.businessId, t.id), index('events_user_idx').on(t.userId, t.id)],
)

/** Work for `runDueJobs()`: SMS, reminders, review asks. Expiry and completion scan bookings directly. */
export const jobs = pgTable(
  'jobs',
  {
    id: bigserial({ mode: 'number' }).primaryKey(),
    kind: text().notNull(),
    runAt: ts().notNull().defaultNow(),
    payload: jsonb().$type<Record<string, unknown>>().notNull(),
    /** Dedupe: a reminder per booking and kind is queued once. */
    dedupeKey: text().unique(),
    attempts: integer().notNull().default(0),
    lockedUntil: ts(),
    doneAt: ts(),
    error: text(),
    createdAt: createdAt(),
  },
  (t) => [index('jobs_due_idx').on(t.doneAt, t.runAt)],
)

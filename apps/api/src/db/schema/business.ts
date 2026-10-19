/**
 * Cities, categories, businesses and everything a business sets up: rules, team, invites, services, tables, class sessions,
 * its client list (ADR 0017, ADR 0018, ADR 0025). A branch is its own business.
 */
import type { DateException, WeekHours } from '@yeral/domain/hours'
import type { Interval, Localized } from '@yeral/domain/model'
import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { users } from './auth'
import {
  bookingType,
  clientSource,
  confirmMode,
  inviteStatus,
  level,
  priceType,
  requestAnswerers,
  staffStatus,
  verificationStatus,
} from './enums'
import { createdAt, ts } from './types'

export interface StoredPhoto {
  /** Key in the media store (`demo/hair-stylist.jpg`); the api turns it into a URL. */
  key: string
  alt: Localized
}

export interface StarterService {
  name: Localized
  durationMin: number
  price: { type: 'fixed' | 'from' | 'free' | 'hidden'; amount: number }
}

/**
 * The market's cities (book Q-107): a visitor's location preselects one, they can pick another, and an address shows its
 * city when it differs from the chosen one. Seed data until the CMS manages them; the market names its main one.
 */
export const cities = pgTable('cities', {
  /** Slug: `ashgabat`. */
  id: text().primaryKey(),
  name: jsonb().$type<Localized>().notNull(),
  /** The centre: a position picks the nearest city. */
  lat: doublePrecision().notNull(),
  lng: doublePrecision().notNull(),
  sort: integer().notNull().default(0),
})

/** The CMS catalogue (seed data until the CMS module exists). */
export const categories = pgTable('categories', {
  /** Slug: `beauty`, `barber`, `dental` … used in `/{lang}/c/{category}`. */
  id: text().primaryKey(),
  icon: text().notNull(),
  name: jsonb().$type<Localized>().notNull(),
  hint: jsonb().$type<Localized>().notNull(),
  intro: jsonb().$type<Localized>().notNull(),
  bookingTypes: bookingType().array().notNull(),
  specialistWord: jsonb().$type<Localized>().notNull(),
  starterServices: jsonb().$type<StarterService[]>().notNull().default([]),
  sort: integer().notNull().default(0),
})

export const businesses = pgTable(
  'businesses',
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    name: text().notNull(),
    categoryId: text()
      .notNull()
      .references(() => categories.id),
    /** What the place is, shown on cards: "Gözellik salony", "Ýoga studiýa". */
    kind: jsonb().$type<Localized>().notNull(),
    bookingTypes: bookingType().array().notNull(),
    about: jsonb().$type<Localized>().notNull(),
    /** The street address, without the city: `cityId` says which. */
    address: text().notNull(),
    cityId: text()
      .notNull()
      .references(() => cities.id),
    /** The street line on search rows. */
    street: text().notNull(),
    entranceNote: text(),
    hideExactAddress: boolean().notNull().default(false),
    lat: doublePrecision().notNull(),
    lng: doublePrecision().notNull(),
    phone: text().notNull(),
    photos: jsonb().$type<StoredPhoto[]>().notNull().default([]),
    /** Amenity keys: `wifi`, `air_conditioning`, `parking`, `card_payment` … */
    amenities: text().array().notNull().default([]),
    hours: jsonb().$type<WeekHours>().notNull(),
    /** Special days ("Aýratyn günler"). */
    exceptions: jsonb().$type<DateException[]>().notNull().default([]),
    avgBill: integer(),
    womenOnly: boolean().notNull().default(false),
    /** Kept up to date from reviews; seeded for demo businesses. */
    rating: real(),
    reviewsCount: integer().notNull().default(0),
    ratingBreakdown: jsonb().$type<Record<'1' | '2' | '3' | '4' | '5', number>>().notNull().default({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }),
    /** Median minutes from request to answer over recent requests; null without history. */
    typicalConfirmMinutes: integer(),
    /** Only verified businesses are public (ADR 0018). */
    verification: verificationStatus().notNull().default('pending'),
    verificationReason: text(),
    /** Table businesses: how long a party keeps a table, and the special-request chips. */
    tableSittingMinutes: integer().notNull().default(120),
    tableRequests: text().array().notNull().default([]),
    /** Demo businesses answer requests by themselves outside production. */
    demo: boolean().notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    index('businesses_category_idx').on(t.categoryId),
    index('businesses_city_idx').on(t.cityId),
    index('businesses_geo_idx').on(t.lat, t.lng),
  ],
)

/** "Ýazylyş düzgünleri", one row per business (`@yeral/domain/rules`). */
export const bookingRules = pgTable('booking_rules', {
  businessId: uuid()
    .primaryKey()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  onlineEnabled: boolean().notNull().default(true),
  confirmMode: confirmMode().notNull().default('manual'),
  requestAnswerers: requestAnswerers().notNull().default('both'),
  holdMinutes: integer().notNull().default(30),
  leadMinutes: integer().notNull().default(60),
  windowDays: integer().notNull().default(30),
  bufferMinutes: integer().notNull().default(10),
  slotStep: integer().notNull().default(15),
  /** null = any time ("Islendik wagt"). */
  cancelWindowMinutes: integer().default(120),
  askCancelReason: boolean().notNull().default(true),
  blockAfterNoShows: integer().notNull().default(2),
  lateToleranceMinutes: integer().notNull().default(15),
  note: jsonb().$type<Localized>(),
})

/**
 * The team: one row per person per workspace (ADR 0025). The row is both who they are to clients (a bookable, active
 * row is a "specialist" on the client site) and their access: the account (`userId`), the level, the override.
 * Owners and administrators are rows too, usually not bookable. A row without an account is a specialist without the
 * app ("Programmasyz") or someone invited who hasn't accepted yet.
 */
export const staff = pgTable(
  'staff',
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    /** The account this person signs in with; kept after they leave, so their kept bookings still block them elsewhere. */
    userId: uuid().references(() => users.id, { onDelete: 'set null' }),
    level: level().notNull().default('specialist'),
    /** As shown to clients: "Aýna". */
    name: text().notNull(),
    fullName: text(),
    specialization: jsonb().$type<Localized>(),
    /** E.164; required without the app (the owner and administrators call them), shown only to them. */
    phone: text(),
    photo: jsonb().$type<StoredPhoto>(),
    gender: text().$type<'female' | 'male'>(),
    bookable: boolean().notNull().default(true),
    /** false = "Programmasyz": never signs in; the owner and administrators answer for them. */
    hasApp: boolean().notNull().default(true),
    /** "Öz haýyşlaryna jogap berip biler": the owner can take it away (book chapter 3). */
    canAnswerOwn: boolean().notNull().default(true),
    status: staffStatus().notNull().default('active'),
    sort: integer().notNull().default(0),
    /** null = business hours; otherwise 7 entries `{open, close} | null`, Monday first. */
    shift: jsonb().$type<({ open: number; close: number } | null)[]>(),
    /** One break per weekday, 7 entries. */
    breaks: jsonb().$type<(Interval | null)[]>().notNull().default([null, null, null, null, null, null, null]),
    daysOff: jsonb().$type<DateException[]>().notNull().default([]),
    rating: real(),
    /** When this person last opened the workspace: the business app opens the most recent one. */
    lastOpenedAt: ts(),
    createdAt: createdAt(),
  },
  (t) => [
    index('staff_business_idx').on(t.businessId),
    index('staff_user_idx').on(t.userId),
    // one row per person per workspace; exactly one active owner
    uniqueIndex('staff_business_user')
      .on(t.businessId, t.userId)
      .where(sql`${t.userId} is not null`),
    uniqueIndex('staff_one_owner')
      .on(t.businessId)
      .where(sql`${t.level} = 'owner' and ${t.status} = 'active'`),
    check('staff_phone_without_app', sql`${t.hasApp} or ${t.phone} is not null`),
    check('staff_owner_has_app', sql`${t.level} <> 'owner' or ${t.hasApp}`),
  ],
)

/**
 * An invite to join a team (book chapter 3, "Joining"): the staff row waits as `invited` (or a specialist without the
 * app keeps working) until the person with this phone signs in and accepts. Valid 7 days; resending starts a new 7
 * days and a new link. `pending` past `expiresAt` reads as expired.
 */
export const invites = pgTable(
  'invites',
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    staffId: uuid()
      .notNull()
      .references(() => staff.id, { onDelete: 'cascade' }),
    /** E.164: only the account with this phone can accept. */
    phone: text().notNull(),
    invitedBy: uuid().references(() => users.id, { onDelete: 'set null' }),
    /** SHA-256 of the link's token; the link opens the invite, never signs anyone in. */
    tokenHash: text().notNull().unique(),
    status: inviteStatus().notNull().default('pending'),
    sentAt: ts().notNull(),
    expiresAt: ts().notNull(),
    answeredAt: ts(),
    createdAt: createdAt(),
  },
  (t) => [
    index('invites_phone_idx').on(t.phone),
    // one open invite per phone per workspace
    uniqueIndex('invites_one_pending')
      .on(t.businessId, t.phone)
      .where(sql`${t.status} = 'pending'`),
  ],
)

export const serviceGroups = pgTable('service_groups', {
  id: uuid().primaryKey().defaultRandom(),
  businessId: uuid()
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  name: jsonb().$type<Localized>().notNull(),
  sort: integer().notNull().default(0),
})

export const services = pgTable(
  'services',
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    groupId: uuid()
      .notNull()
      .references(() => serviceGroups.id),
    name: jsonb().$type<Localized>().notNull(),
    description: jsonb().$type<Localized>(),
    durationMin: integer().notNull(),
    priceType: priceType().notNull().default('fixed'),
    priceAmount: integer().notNull().default(0),
    /** null = the business buffer. */
    bufferMin: integer(),
    online: boolean().notNull().default(true),
    sort: integer().notNull().default(0),
    /** Removed from the menu; old bookings keep their snapshot. */
    archived: boolean().notNull().default(false),
  },
  (t) => [index('services_business_idx').on(t.businessId)],
)

export const staffServices = pgTable(
  'staff_services',
  {
    staffId: uuid()
      .notNull()
      .references(() => staff.id, { onDelete: 'cascade' }),
    serviceId: uuid()
      .notNull()
      .references(() => services.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.staffId, t.serviceId] })],
)

export const tableAreas = pgTable('table_areas', {
  id: uuid().primaryKey().defaultRandom(),
  businessId: uuid()
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  name: jsonb().$type<Localized>().notNull(),
  note: jsonb().$type<Localized>(),
  minParty: integer().notNull().default(1),
  maxParty: integer().notNull().default(8),
  sort: integer().notNull().default(0),
})

export const diningTables = pgTable('dining_tables', {
  id: uuid().primaryKey().defaultRandom(),
  areaId: uuid()
    .notNull()
    .references(() => tableAreas.id, { onDelete: 'cascade' }),
  seats: integer().notNull(),
  label: text(),
})

export const classSessions = pgTable(
  'class_sessions',
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    name: jsonb().$type<Localized>().notNull(),
    trainerId: uuid().references(() => staff.id, { onDelete: 'set null' }),
    level: jsonb().$type<Localized>(),
    date: date({ mode: 'string' }).notNull(),
    start: integer().notNull(),
    durationMin: integer().notNull(),
    capacity: integer().notNull(),
    price: integer().notNull().default(0),
  },
  (t) => [index('class_sessions_business_date_idx').on(t.businessId, t.date)],
)

/** The business's client list ("Müşderiler"); stats come from bookings. */
export const clients = pgTable(
  'clients',
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    phone: text().notNull(),
    name: text(),
    birthday: date({ mode: 'string' }),
    source: clientSource(),
    tags: text().array().notNull().default([]),
    noRemindersSms: boolean().notNull().default(false),
    /**
     * "Diňe jaň arkaly ýazylyp biler" switched on by hand. The no-show limit blocks too, worked out from the bookings
     * (book Q-127, `isClientBlocked`).
     */
    onlineBlocked: boolean().notNull().default(false),
    /** When the business last lifted the block: no-shows marked before then don't count toward the limit. */
    noShowsSince: ts(),
    /** The Ýeral account with this phone, once known. */
    userId: uuid().references(() => users.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [unique('clients_business_phone').on(t.businessId, t.phone), index('clients_user_idx').on(t.userId)],
)

export const clientNotes = pgTable('client_notes', {
  id: uuid().primaryKey().defaultRandom(),
  clientId: uuid()
    .notNull()
    .references(() => clients.id, { onDelete: 'cascade' }),
  text: text().notNull(),
  /** "Ýazylanda görkez": shown on booking blocks and drawers. */
  alert: boolean().notNull().default(false),
  authorStaffId: uuid().references(() => staff.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
})

export const favorites = pgTable(
  'favorites',
  {
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.businessId] })],
)

/** "Nirede?" suggestions: districts, streets, landmarks, each in a city. */
export const places = pgTable('places', {
  id: uuid().primaryKey().defaultRandom(),
  cityId: text()
    .notNull()
    .references(() => cities.id),
  label: jsonb().$type<Localized>().notNull(),
  lat: doublePrecision().notNull(),
  lng: doublePrecision().notNull(),
})

export const verificationHistory = pgTable('verification_history', {
  id: uuid().primaryKey().defaultRandom(),
  businessId: uuid()
    .notNull()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  status: verificationStatus().notNull(),
  reason: text(),
  at: ts().notNull().defaultNow(),
})

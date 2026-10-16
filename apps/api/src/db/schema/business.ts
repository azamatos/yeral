/**
 * Categories, businesses and everything a business sets up: rules, team, roles, services, tables, class sessions,
 * its client list (ADR 0017, ADR 0018). A branch is its own business.
 */
import type { DateException, WeekHours } from '@yeral/domain/hours'
import type { Interval, Localized } from '@yeral/domain/model'
import type { Permission } from '@yeral/domain/permissions'
import { boolean, date, doublePrecision, index, integer, jsonb, pgTable, primaryKey, real, text, unique, uuid } from 'drizzle-orm/pg-core'
import { users } from './auth'
import { bookingType, clientSource, confirmMode, membershipStatus, priceType, staffStatus, verificationStatus, visibility } from './enums'
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
    address: text().notNull(),
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
  (t) => [index('businesses_category_idx').on(t.categoryId), index('businesses_geo_idx').on(t.lat, t.lng)],
)

/** "Ýazylyş düzgünleri", one row per business (`@yeral/domain/rules`). */
export const bookingRules = pgTable('booking_rules', {
  businessId: uuid()
    .primaryKey()
    .references(() => businesses.id, { onDelete: 'cascade' }),
  onlineEnabled: boolean().notNull().default(true),
  confirmMode: confirmMode().notNull().default('manual'),
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

/** Everyone on the team; a bookable, active row is a "specialist" on the client site. */
export const staff = pgTable(
  'staff',
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    /** As shown to clients: "Aýna". */
    name: text().notNull(),
    fullName: text(),
    specialization: jsonb().$type<Localized>(),
    phone: text(),
    photo: jsonb().$type<StoredPhoto>(),
    gender: text().$type<'female' | 'male'>(),
    bookable: boolean().notNull().default(true),
    /** false = "Programmasyz": never logs in, owner/admin answer for them. */
    hasApp: boolean().notNull().default(true),
    status: staffStatus().notNull().default('active'),
    sort: integer().notNull().default(0),
    /** null = business hours; otherwise 7 entries `{open, close} | null`, Monday first. */
    shift: jsonb().$type<({ open: number; close: number } | null)[]>(),
    /** One break per weekday, 7 entries. */
    breaks: jsonb().$type<(Interval | null)[]>().notNull().default([null, null, null, null, null, null, null]),
    daysOff: jsonb().$type<DateException[]>().notNull().default([]),
    rating: real(),
    createdAt: createdAt(),
  },
  (t) => [index('staff_business_idx').on(t.businessId)],
)

/** Per-business roles from templates; Eýesi is the locked system role. */
export const roles = pgTable(
  'roles',
  {
    id: uuid().primaryKey().defaultRandom(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    template: text().$type<'owner' | 'admin' | 'specialist'>(),
    system: boolean().notNull().default(false),
    visibility: visibility().notNull(),
    permissions: text().array().$type<Permission[]>().notNull().default([]),
  },
  (t) => [index('roles_business_idx').on(t.businessId)],
)

/** Who can sign in to which business, with which role, as which team member. */
export const memberships = pgTable(
  'memberships',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid().references(() => users.id, { onDelete: 'cascade' }),
    /** Invites go to a phone; the membership links to the user on their first login. */
    phone: text().notNull(),
    businessId: uuid()
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    roleId: uuid()
      .notNull()
      .references(() => roles.id),
    staffId: uuid().references(() => staff.id, { onDelete: 'set null' }),
    status: membershipStatus().notNull().default('invited'),
    createdAt: createdAt(),
  },
  (t) => [unique('memberships_business_phone').on(t.businessId, t.phone), index('memberships_user_idx').on(t.userId)],
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
    onlineBlocked: boolean().notNull().default(false),
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

/** "Nirede?" suggestions: districts, streets, landmarks. */
export const places = pgTable('places', {
  id: uuid().primaryKey().defaultRandom(),
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

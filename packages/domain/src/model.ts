/**
 * The vocabulary of the booking engine (ADR 0017, ADR 0018). Enums are `as const` arrays so `@yeral/contract` builds
 * its zod enums from the same lists (`z.enum(BOOKING_STATUSES)`) and the database uses them for its enum types.
 */
import { MARKET } from './market'

/** How a business is booked. `resource` is designed for later. */
export const BOOKING_TYPES = ['appointment', 'table', 'class'] as const
export type BookingType = (typeof BOOKING_TYPES)[number]

/** Five statuses with one meaning everywhere (design spec §6). */
export const BOOKING_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled', 'noshow'] as const
export type BookingStatus = (typeof BOOKING_STATUSES)[number]

export const CANCELLED_BY = ['client', 'business', 'system'] as const
export type CancelledBy = (typeof CANCELLED_BY)[number]

/** Where a booking came from; the workspace shows web and app as "Onlaýn". */
export const BOOKING_SOURCES = ['web', 'app', 'phone', 'walkin', 'ai'] as const
export type BookingSource = (typeof BOOKING_SOURCES)[number]
export const isOnlineSource = (s: BookingSource) => s === 'web' || s === 'app' || s === 'ai'

export const CONFIRM_MODES = ['manual', 'instant'] as const
export type ConfirmMode = (typeof CONFIRM_MODES)[number]

/** Decline reason chips (business spec §4): "Bu wagt boş däl", "Hünärmen ýok", "Bu hyzmaty edip bilmeýäris", "Başga sebäp". */
export const DECLINE_REASONS = ['slot_busy', 'no_staff', 'cannot_do', 'other'] as const
export type DeclineReason = (typeof DECLINE_REASONS)[number]

/** "Arz et" — what happened (business spec §3): Gelmedi, Gijä galdy, Gödek gylyk, Başga. */
export const COMPLAINT_TYPES = ['noshow', 'late', 'rude', 'other'] as const
export type ComplaintType = (typeof COMPLAINT_TYPES)[number]

export const PRICE_TYPES = ['fixed', 'from', 'free', 'hidden'] as const
export type PriceType = (typeof PRICE_TYPES)[number]
/** Whole manats. `amount` is 0 for free and may be 0 for hidden. */
export interface Price {
  type: PriceType
  amount: number
}

export const VERIFICATION_STATUSES = ['pending', 'verified', 'rejected'] as const
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number]

export const STAFF_STATUSES = ['active', 'invited', 'disabled'] as const
export type StaffStatus = (typeof STAFF_STATUSES)[number]

/** "Nireden geldi" on a client record. */
export const CLIENT_SOURCES = ['instagram', 'referral', 'yeral', 'walkby', 'other'] as const
export type ClientSource = (typeof CLIENT_SOURCES)[number]

/**
 * Every language the code has translations for, in the order of the database's `locale` enum. English is the source
 * (ADR 0022); a deployment offers its market's subset (`MARKET.languages`).
 */
export const LOCALES = ['tk', 'ru', 'en'] as const
export type Locale = (typeof LOCALES)[number]
/**
 * Text written per language (service names, descriptions, about, catalogue names). A business fills in any one of its
 * market's languages, or several (book Q-102); `localizedSchema` (`@yeral/contract/common`) requires at least one.
 */
export type Localized = Partial<Record<Locale, string>>

/** The text in a language; else in the market's main language; else whichever language it was written in. */
export function localized(text: Localized, locale: Locale): string {
  return text[locale] || text[MARKET.defaultLanguage] || Object.values(text).find(Boolean) || ''
}

/** A stretch of one business day, minutes from midnight, end excluded. */
export interface Interval {
  start: number
  end: number
}

export const overlaps = (a: Interval, b: Interval) => a.start < b.end && b.start < a.end
export const contains = (outer: Interval, inner: Interval) => outer.start <= inner.start && inner.end <= outer.end

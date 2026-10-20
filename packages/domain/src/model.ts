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
/** Entered by the team: a phone call or a walk-in (B-23, B-25). */
export const isTeamSource = (s: BookingSource) => s === 'phone' || s === 'walkin'

export const CONFIRM_MODES = ['manual', 'instant'] as const
export type ConfirmMode = (typeof CONFIRM_MODES)[number]

/** Decline reason chips (business spec §4): "Bu wagt boş däl", "Hünärmen ýok", "Bu hyzmaty edip bilmeýäris", "Başga sebäp". */
export const DECLINE_REASONS = ['slot_busy', 'no_staff', 'cannot_do', 'other'] as const
export type DeclineReason = (typeof DECLINE_REASONS)[number]

/**
 * Why the business cancels a booking. The team picks one of the first three (B-27): "The client called to cancel",
 * "The specialist can't come in", "Other reason" (in words). The others come with a cancel and 3 offered times when the
 * business closes on a special day (`closed`, its name kept) or its hours change (`hours`) over bookings (B-39, B-40).
 */
export const BUSINESS_CANCEL_REASONS = ['client_called', 'staff_away', 'other', 'closed', 'hours'] as const
export type BusinessCancelReason = (typeof BUSINESS_CANCEL_REASONS)[number]
/** The reasons on the team's cancel modal (B-27). */
export const TEAM_CANCEL_REASONS = ['client_called', 'staff_away', 'other'] as const satisfies readonly BusinessCancelReason[]
/** A cancel that stays the business's: every reason but "The client called to cancel", which is the client's own. */
export const BUSINESS_SIDE_CANCEL_REASONS = ['staff_away', 'other', 'closed', 'hours'] as const satisfies readonly BusinessCancelReason[]
export type BusinessSideCancelReason = (typeof BUSINESS_SIDE_CANCEL_REASONS)[number]
export const isBusinessSideCancel = (r: BusinessCancelReason): r is BusinessSideCancelReason => r !== 'client_called'

/**
 * The business's own words a decline or a cancel carries: "Other reason" in words (B-20, B-27), or the special day's
 * name it closed for (`closed`, B-40); for any other reason none, and the reason's label says it.
 */
export const reasonWords = (reason: DeclineReason | BusinessCancelReason, text: string | null): string | null =>
  (reason === 'other' || reason === 'closed') && text ? text : null

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

/**
 * What a business offers on its page's About section (book B-37). The demo's four; the design names no longer list yet,
 * so more join here when it does.
 */
export const AMENITIES = ['wifi', 'air_conditioning', 'parking', 'card_payment'] as const
export type Amenity = (typeof AMENITIES)[number]

/**
 * A row on the team: `active` works (bookable rows appear on the client site), `invited` waits for the person to accept
 * (not on the client site), `removed` by the owner or left (*Öçürilen*; the owner can reactivate).
 */
export const STAFF_STATUSES = ['active', 'invited', 'removed'] as const
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

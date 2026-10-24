/**
 * API errors: `{ error: { code, message?, details? } }` with the HTTP status below (ADR 0006). The UI shows
 * `errors.<code>` from i18n, so every code needs a message in tk, ru and en.
 */
import { PLAN_PROBLEMS } from '@yeral/domain/availability'
import { MAX_ALTERNATIVES, WAITING_SCOPES } from '@yeral/domain/lifecycle'
import { SETUP_NEEDS } from '@yeral/domain/setup'
import { z } from 'zod'
import { bookingCodeSchema, epochSchema, idSchema, minuteSchema, startMinuteSchema, timeSlotSchema, ymdSchema } from './common'

export const ERROR_STATUS = {
  validation_error: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  /** A business still in review, or rejected (book F-032): "Bu sahypa entek açylmady", not the plain 404. */
  in_review: 404,
  // booking
  slot_taken: 409,
  online_disabled: 409,
  online_blocked: 403,
  not_bookable: 409,
  party_too_large: 400,
  session_full: 409,
  invalid_status: 409,
  request_expired: 409,
  offer_past: 409,
  cancel_window_passed: 409,
  already_started: 409,
  not_started: 409,
  already_reported: 409,
  noshow_window_passed: 409,
  /** A complaint is taken back only within 7 days of filing it (book Q-207). */
  complaint_locked: 409,
  restore_expired: 409,
  /** "Yzyna al" on a booking the team just added came after the undo time (B-24). */
  undo_expired: 409,
  too_many_waiting: 409,
  /** The business's move doesn't fit (B-26): `details.problem` says why, for whom, and the time taken elsewhere. */
  cannot_move: 409,
  /** The booking has the client's new time waiting for an answer: answer it first (B-21, B-26). */
  move_waiting: 409,
  /** Blocked time over bookings (B-18, Q-204): `details.bookings` are the ones in the way. */
  block_over_bookings: 409,
  /** "Iň köp 5 içerki ýagdaý bolup biler" (B-29). */
  statuses_full: 409,
  // photos
  /** "Iň köp 20 surat" (book Q-115). */
  gallery_full: 409,
  // setting up
  /** One business is set up at a time (book Q-200): `details.slug` is the one to finish. */
  setup_in_progress: 409,
  /** Finishing needs an address, an open day and a service: `details.missing` (B-03, B-04). */
  setup_incomplete: 409,
  // clients
  /** The number is already one of the business's clients (B-33): `details` has the card to open. */
  client_exists: 409,
  /** The number follows the client's Ýeral account: it can't be changed here (B-34). */
  client_phone_locked: 409,
  /** A client with bookings ahead or waiting requests (B-36, Q-208): `details.bookings` are the ones to settle first. */
  client_has_bookings: 409,
  // reviews
  review_exists: 409,
  review_not_allowed: 403,
  review_locked: 409,
  review_window_passed: 409,
  // login code
  code_invalid: 400,
  code_expired: 400,
  too_many_attempts: 429,
  resend_too_soon: 429,
  phone_taken: 409,
  /** The number can't be changed while the sign-in code shows on the screen (the first launch, book Q-036). */
  phone_change_unavailable: 409,
  // account and team
  owns_workspace: 409,
  already_on_team: 409,
  invite_expired: 409,
  invite_answered: 409,
  owner_cannot_leave: 409,
  // business settings
  group_not_empty: 409,
  /** New hours or a special day leave bookings outside: keep or cancel them (book Q-211), `details` lists them. */
  bookings_affected: 409,
  // the Ýeral team's sign-in (ADR 0026)
  /** The login, the password or the code is wrong: one answer for all three. */
  sign_in_failed: 401,
  /** The authenticator code didn't match while setting the app up. */
  admin_code_wrong: 400,
  /** A setup link that ran out, was used or never was. */
  setup_expired: 404,
  login_taken: 409,
  /** The owner's number has an account unused for 6 months (book Q-270): its holder signs in first. */
  owner_account_unused: 409,
  /** The server has no `ADMIN_SECRET_KEY`: no admin tool there. */
  admin_unavailable: 503,
  /** The address search has no geocoder here, or it didn't answer (ADR 0027): the pin can be placed by hand. */
  address_search_unavailable: 503,
  /** Nothing is verified while the sign-in code shows on the screen: the first launch has no real businesses (book Q-036). */
  verify_unavailable: 409,
  // the business app's demo workspace (book F-242)
  /** A demo session tries the demo workspace only: this reaches beyond it. */
  not_in_demo: 403,
  /** A number typed in the demo must be in the market's unused range: `details.prefix` ("69"). */
  demo_number: 400,
  rate_limited: 429,
  internal: 500,
} as const satisfies Record<string, number>

export type ErrorCode = keyof typeof ERROR_STATUS
export const ERROR_CODES = Object.keys(ERROR_STATUS) as [ErrorCode, ...ErrorCode[]]

export const errorSchema = z
  .object({
    error: z.object({
      code: z.enum(ERROR_CODES),
      message: z.string().optional(),
      details: z.record(z.string(), z.unknown()).optional(),
    }),
  })
  .meta({ id: 'Error' })
export type ApiErrorBody = z.infer<typeof errorSchema>

/** `slot_taken`: the nearest free times of the same day ("Bu wagt ýaňy alyndy. Golaý boş wagtlar"). */
export const slotTakenDetailsSchema = z.object({ alternatives: z.array(timeSlotSchema).max(MAX_ALTERNATIVES) })

/** `party_too_large`: "{callFrom} we ondan köp adam bolsa, jaň ediň" — parties from this size book by phone. */
export const partyTooLargeDetailsSchema = z.object({ callFrom: z.number().int().min(2) })
export type PartyTooLargeDetails = z.infer<typeof partyTooLargeDetailsSchema>

/** `cannot_move`: why the move is refused, for which specialist, and for `elsewhere` the time taken there (Q-272). */
export const cannotMoveDetailsSchema = z.object({
  problem: z.enum(PLAN_PROBLEMS),
  staffId: z.string(),
  busy: z.object({ start: z.number().int(), end: z.number().int() }).optional(),
})
export type CannotMoveDetails = z.infer<typeof cannotMoveDetailsSchema>

/** `too_many_waiting`: the client already has `limit` requests waiting at this business or across Ýeral (book Q-124). */
export const tooManyWaitingDetailsSchema = z.object({ scope: z.enum(WAITING_SCOPES), limit: z.number().int().min(1) })
export type TooManyWaitingDetails = z.infer<typeof tooManyWaitingDetailsSchema>

/** `code_invalid`: "Kod nädogry. Ýene N synanyşyk galdy." */
export const codeInvalidDetailsSchema = z.object({ attemptsLeft: z.number().int().min(0) })

/** `too_many_attempts`, `resend_too_soon`. */
export const retryDetailsSchema = z.object({ retryAfterSec: z.number().int().min(0) })

/** `rate_limited`: the wait also in whole minutes, rounded up, which its message shows (book Q-267). */
export const rateLimitedDetailsSchema = retryDetailsSchema.extend({ retryAfterMin: z.number().int().min(1) })

/** `validation_error`: which fields, with zod's issue codes. */
export const validationDetailsSchema = z.object({
  issues: z.array(z.object({ path: z.array(z.union([z.string(), z.number()])), code: z.string() })),
})

/** `setup_in_progress`: the business to finish setting up first. */
export const setupInProgressDetailsSchema = z.object({ slug: z.string() })
export type SetupInProgressDetails = z.infer<typeof setupInProgressDetailsSchema>

/** `setup_incomplete`: what finishing still needs (book B-03, B-04). */
export const setupIncompleteDetailsSchema = z.object({ missing: z.array(z.enum(SETUP_NEEDS)).min(1) })
export type SetupIncompleteDetails = z.infer<typeof setupIncompleteDetailsSchema>

/** `client_exists`: "This number belongs to Gülälek N. — open the card". */
export const clientExistsDetailsSchema = z.object({ id: idSchema, name: z.string().nullable() })
export type ClientExistsDetails = z.infer<typeof clientExistsDetailsSchema>

/** `client_has_bookings`: the bookings ahead and the waiting requests, soonest first. */
export const clientHasBookingsDetailsSchema = z.object({
  bookings: z.array(
    z.object({
      code: bookingCodeSchema,
      date: ymdSchema,
      start: startMinuteSchema,
      end: minuteSchema,
      status: z.enum(['pending', 'confirmed']),
    }),
  ),
})
export type ClientHasBookingsDetails = z.infer<typeof clientHasBookingsDetailsSchema>

/** `block_over_bookings`: the bookings blocked time would cover, soonest first. */
export const blockOverBookingsDetailsSchema = z.object({
  bookings: z.array(z.object({ code: bookingCodeSchema, date: ymdSchema, start: startMinuteSchema, end: minuteSchema })),
})
export type BlockOverBookingsDetails = z.infer<typeof blockOverBookingsDetailsSchema>

/**
 * `bookings_affected`: "Şu günlere 3 ýazylyş bar — Aýna 2, Maral 1", and each booking (the AffectedBookingsList: "5
 * bookings and 1 request fall outside the new hours", rows "client · service · specialist", a request with its timer).
 */
export const bookingsAffectedDetailsSchema = z.object({
  count: z.number().int().min(1),
  /** How many of `count` are requests waiting for an answer ("5 bookings · 1 request"). */
  requests: z.number().int().min(0),
  byStaff: z.array(z.object({ staffId: idSchema, name: z.string(), count: z.number().int().min(1) })),
  bookings: z.array(
    z.object({
      code: bookingCodeSchema,
      date: ymdSchema,
      start: startMinuteSchema,
      end: minuteSchema,
      /** A request waiting for an answer, or a confirmed booking. */
      status: z.enum(['pending', 'confirmed']),
      /** A request's answer time ("45 min"); null for a confirmed booking. */
      holdUntil: epochSchema.nullable(),
      client: z.string().nullable(),
      /** The booked services' names in the reader's language, in the booking's order. */
      services: z.array(z.string()),
      staff: z.array(z.string()),
      /** Removing a specialist (B-50): the colleagues who do this booking's services, for the "Kime" list. */
      colleagues: z.array(z.object({ staffId: idSchema, name: z.string() })).optional(),
    }),
  ),
})
export type BookingsAffectedDetails = z.infer<typeof bookingsAffectedDetailsSchema>

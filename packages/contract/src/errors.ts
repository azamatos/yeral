/**
 * API errors: `{ error: { code, message?, details? } }` with the HTTP status below (ADR 0006). The UI shows
 * `errors.<code>` from i18n, so every code needs a message in tk, ru and en.
 */
import { PLAN_PROBLEMS } from '@yeral/domain/availability'
import { MAX_ALTERNATIVES, WAITING_SCOPES } from '@yeral/domain/lifecycle'
import { z } from 'zod'
import { bookingCodeSchema, idSchema, minuteSchema, startMinuteSchema, timeSlotSchema, ymdSchema } from './common'

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
  restore_expired: 409,
  /** "Yzyna al" on a booking the team just added came after the undo time (B-24). */
  undo_expired: 409,
  too_many_waiting: 409,
  /** The business's move doesn't fit (B-26): `details.problem` says why, for whom, and the time taken elsewhere. */
  cannot_move: 409,
  /** The booking has the client's new time waiting for an answer: answer it first (B-21, B-26). */
  move_waiting: 409,
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

/** `bookings_affected`: "Şu günlere 3 ýazylyş bar — Aýna 2, Maral 1", and each booking. */
export const bookingsAffectedDetailsSchema = z.object({
  count: z.number().int().min(1),
  byStaff: z.array(z.object({ staffId: idSchema, name: z.string(), count: z.number().int().min(1) })),
  bookings: z.array(
    z.object({
      code: bookingCodeSchema,
      date: ymdSchema,
      start: startMinuteSchema,
      end: minuteSchema,
      client: z.string().nullable(),
      staff: z.array(z.string()),
      /** Removing a specialist (B-50): the colleagues who do this booking's services, for the "Kime" list. */
      colleagues: z.array(z.object({ staffId: idSchema, name: z.string() })).optional(),
    }),
  ),
})
export type BookingsAffectedDetails = z.infer<typeof bookingsAffectedDetailsSchema>

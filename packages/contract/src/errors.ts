/**
 * API errors: `{ error: { code, message?, details? } }` with the HTTP status below (ADR 0006). The UI shows
 * `errors.<code>` from i18n, so every code needs a message in tk, ru and en.
 */
import { MAX_ALTERNATIVES } from '@yeral/domain/lifecycle'
import { z } from 'zod'
import { timeSlotSchema } from './common'

export const ERROR_STATUS = {
  validation_error: 400,
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
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
  restore_expired: 409,
  // reviews
  review_exists: 409,
  review_not_allowed: 403,
  review_locked: 409,
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

/** `code_invalid`: "Kod nädogry. Ýene N synanyşyk galdy." */
export const codeInvalidDetailsSchema = z.object({ attemptsLeft: z.number().int().min(0) })

/** `too_many_attempts`, `resend_too_soon`, `rate_limited`. */
export const retryDetailsSchema = z.object({ retryAfterSec: z.number().int().min(0) })

/** `validation_error`: which fields, with zod's issue codes. */
export const validationDetailsSchema = z.object({
  issues: z.array(z.object({ path: z.array(z.union([z.string(), z.number()])), code: z.string() })),
})

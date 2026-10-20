/**
 * Business settings (book chapter 7b, B-37–B-43): what the owner and administrators change for their workspace
 * (`/w/{slug}/settings/…`). Specialists don't see them (403). The booking rules first (B-41, B-42).
 */
import { CONFIRM_MODES } from '@yeral/domain/model'
import { REQUEST_ANSWERERS } from '@yeral/domain/rules'
import { z } from 'zod'

/**
 * The booking rules (B-41). The values each one takes are the settings screen's options (`RULE_OPTIONS` in
 * `@yeral/domain/rules`); anything else is a `validation_error` naming the field.
 */
export const bookingRulesSchema = z
  .object({
    /** "Onlaýn ýazylyş": off, the client page asks people to call; bookings made before don't change. */
    onlineEnabled: z.boolean(),
    /** Each online booking a request, or confirmed at once. */
    confirmMode: z.enum(CONFIRM_MODES),
    /** Who answers requests in manual mode (B-42); the owner always can. */
    requestAnswerers: z.enum(REQUEST_ANSWERERS),
    /** How long a request waits for an answer: 15, 30, 60, 120, 360 or 1440 minutes. */
    holdMinutes: z.number().int(),
    /** The least time before a start: 0 (no limit), 30, 60, 120, 240 or 1440 minutes. */
    leadMinutes: z.number().int(),
    /** How many days ahead the calendar is open: 7, 14, 30, 60 or 90. */
    windowDays: z.number().int(),
    /** Free time after a visit: 0–120 minutes; a service may set its own. */
    bufferMinutes: z.number().int(),
    /** Start times every 15 or 30 minutes. */
    slotStep: z.number().int(),
    /** A client may cancel or move until this many minutes before: 60, 120, 360, 720, 1440, 2880; null = any time. */
    cancelWindowMinutes: z.number().int().nullable(),
    /** "Ýatyrylanda sebäp sora": ask the client why they cancel. */
    askCancelReason: z.boolean(),
    /** After this many no-shows a client books only by phone: 0 (never) to 5. */
    blockAfterNoShows: z.number().int(),
    /** How late a client may be: 15 minutes everywhere in the MVP (book Q-118); not a setting yet (F-103). */
    lateMinutes: z.number().int(),
  })
  .meta({ id: 'BookingRules' })

/** Change some of the rules; the others stay. Changing the mode or the hold leaves waiting requests as they are (Q-205). */
export const bookingRulesUpdateSchema = bookingRulesSchema.omit({ lateMinutes: true }).partial().strict().meta({ id: 'BookingRulesUpdate' })

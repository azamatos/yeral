/**
 * Booking requests as the business answers them (book B-19, B-20, B-21; `/w/{slug}/requests…`): new requests and
 * clients' moves of confirmed bookings, waiting for an answer. Who may answer follows the "who answers" setting and the
 * per-person override (chapter 3); the owner always can.
 */
import { DECLINE_REASONS } from '@yeral/domain/model'
import { MAX_ALTERNATIVES } from '@yeral/domain/lifecycle'
import { z } from 'zod'
import {
  bookingCodeSchema,
  bookingTypeSchema,
  epochSchema,
  idSchema,
  minuteSchema,
  phoneSchema,
  priceSchema,
  slugSchema,
  startMinuteSchema,
  ymdSchema,
} from './common'

/** One service of a booking as the team sees it. */
export const teamItemSchema = z.object({
  serviceId: idSchema.nullable(),
  service: z.string(),
  staffId: idSchema.nullable(),
  staff: z.string().nullable(),
  start: minuteSchema,
  end: minuteSchema,
})

export const requestSchema = z
  .object({
    code: bookingCodeSchema,
    /** A new booking, or a client's move of a confirmed one (B-21). */
    kind: z.enum(['new', 'move']),
    type: bookingTypeSchema,
    date: ymdSchema,
    start: startMinuteSchema,
    end: minuteSchema,
    /** "Jogap bermäge 18 min galdy": the answer is due by then; after it the request runs out (B-22). */
    holdUntil: epochSchema,
    /**
     * "Haýyşyň wagty gutarýar" is due then (book S-01): 5 minutes of open time before `holdUntil`; null for a short
     * answer time. Those who may answer (`canAnswer`) hear it.
     */
    warnAt: epochSchema.nullable(),
    sentAt: epochSchema,
    items: z.array(teamItemSchema),
    price: priceSchema.nullable(),
    note: z.string().nullable(),
    /** A move: the booking's time now ("Öňki wagt"); it keeps it unless the move is confirmed. */
    from: z.object({ date: ymdSchema, start: startMinuteSchema, end: minuteSchema }).nullable(),
    /**
     * "3-nji gelşi" or a new client; no-shows if any (a specialist counts the bookings with them); the notes "shown when
     * they book", newest first; `id` opens the client card (null once the record is gone).
     */
    client: z.object({
      id: idSchema.nullable(),
      name: z.string(),
      phone: phoneSchema.nullable(),
      visits: z.number().int(),
      noShows: z.number().int(),
      alerts: z.array(z.string()),
    }),
    /** May the viewer confirm or decline it. */
    canAnswer: z.boolean(),
    /** Who answers by the setting: the owner and administrators, the request's specialist, or whoever is first. */
    answeredBy: z.enum(['desk', 'specialist', 'anyone']),
  })
  .meta({ id: 'Request' })

/** The waiting requests the viewer may see, the most urgent (least time left) first. */
export const requestListSchema = z.object({ items: z.array(requestSchema) }).meta({ id: 'RequestList' })

/**
 * "Ret et" (B-20): the reason the client sees ("other" in words), and for a new request up to 3 times the client can
 * take in one tap, each with its specialist (Q-159); a move is declined with the reason only (B-21).
 */
export const declineInputSchema = z
  .object({
    reason: z.enum(DECLINE_REASONS),
    text: z.string().trim().min(1).max(300).optional(),
    offers: z
      .array(z.object({ date: ymdSchema, start: startMinuteSchema, staffId: idSchema }).strict())
      .max(MAX_ALTERNATIVES)
      .optional(),
  })
  .strict()
  .refine((d) => d.reason !== 'other' || !!d.text, { path: ['text'], message: 'Say the reason in words' })
  .meta({ id: 'DeclineInput' })

export const requestParamSchema = z.object({ slug: slugSchema, code: bookingCodeSchema })

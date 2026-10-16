/**
 * Live updates (systemPatterns.md "Data flow"): every change writes an event; open screens poll
 * `GET /v1/events?after=<cursor>` and invalidate the matching queries.
 */
import { z } from 'zod'
import { bookingCodeSchema, epochSchema, slugSchema } from './common'

export const EVENT_TYPES = [
  'booking.created',
  'booking.confirmed',
  'booking.declined',
  'booking.cancelled',
  'booking.expired',
  'booking.moved',
  'booking.completed',
  'booking.noshow',
  'booking.updated',
  'review.created',
] as const
export type EventType = (typeof EVENT_TYPES)[number]

export const eventSchema = z
  .object({
    id: z.string(),
    type: z.enum(EVENT_TYPES),
    at: epochSchema,
    bookingCode: bookingCodeSchema.nullable(),
    business: slugSchema.nullable(),
  })
  .meta({ id: 'Event' })

export const eventsQuerySchema = z.object({ after: z.string().max(40).optional() })
export const eventListSchema = z.object({
  items: z.array(eventSchema),
  /** Pass as `after` next time. */
  cursor: z.string(),
})

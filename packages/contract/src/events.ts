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
  /** Someone joined, declined, left or was invited, removed or changed: the team and the switcher refresh. */
  'team.changed',
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

/** Where a poll left off: `<txid>.<id>` (`7421.318`), the order events commit in. Opaque to the apps. */
export const eventCursorSchema = z
  .string()
  .regex(/^\d{1,20}\.\d{1,19}$/)
  .meta({ example: '7421.318' })

/** `after` also takes the old numeric cursor (`318`) until every open page has polled once with the new one. */
export const eventsQuerySchema = z.object({
  after: z
    .string()
    .regex(/^\d{1,20}(\.\d{1,19})?$/)
    .optional(),
})
export const eventListSchema = z.object({
  items: z.array(eventSchema),
  /** Pass as `after` next time. */
  cursor: eventCursorSchema,
})

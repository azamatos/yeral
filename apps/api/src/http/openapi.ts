/** Shorthands for route declarations (`createRoute`): JSON bodies, responses and the shared error responses. */
import { errorSchema } from '@yeral/contract/errors'
import type { z } from 'zod'

export const jsonBody = <T extends z.ZodType>(schema: T) => ({ body: { content: { 'application/json': { schema } }, required: true } })

/** A form's body, such as an upload (`photoUploadSchema`). */
export const formBody = <T extends z.ZodType>(schema: T) => ({ body: { content: { 'multipart/form-data': { schema } }, required: true } })

export const json = <T extends z.ZodType>(schema: T, description = 'OK') => ({ content: { 'application/json': { schema } }, description })

const err = (description: string) => ({ content: { 'application/json': { schema: errorSchema } }, description })

/** Errors every route may answer with (bodies per `@yeral/contract/errors`). */
export const errors = {
  400: err('Invalid input (`validation_error`, `code_invalid` …)'),
  401: err('Not signed in'),
  403: err('Not allowed'),
  404: err('Not found'),
  409: err('Conflict (`slot_taken` with alternatives, `invalid_status` …)'),
  429: err('Too many requests (`retryAfterSec`; `rate_limited` also `retryAfterMin`)'),
  503: err('Not here now: the admin tool (`admin_unavailable`) or the address search (`address_search_unavailable`)'),
} as const

export const noContent = { 204: { description: 'Done' } } as const

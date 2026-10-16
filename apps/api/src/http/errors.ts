/** API errors: `{ error: { code, message?, details? } }` with the status from the contract (ADR 0006). */
import { ERROR_STATUS, type ApiErrorBody, type ErrorCode } from '@yeral/contract/errors'
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { ZodError } from 'zod'

export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly details?: Record<string, unknown>,
    message?: string,
  ) {
    super(message ?? code)
    this.name = 'ApiError'
  }

  get status(): ContentfulStatusCode {
    return ERROR_STATUS[this.code]
  }
}

export function errorBody(code: ErrorCode, details?: Record<string, unknown>, message?: string): ApiErrorBody {
  return { error: { code, ...(message ? { message } : {}), ...(details ? { details } : {}) } }
}

export function errorResponse(c: Context, e: ApiError) {
  return c.json(errorBody(e.code, e.details, e.message === e.code ? undefined : e.message), e.status)
}

export function validationDetails(error: ZodError) {
  return { issues: error.issues.map((i) => ({ path: i.path.filter((p) => typeof p !== 'symbol'), code: i.code })) }
}

/**
 * The typed api client (ADR 0006): Hono's RPC client over the api's route types (a type-only import, no runtime
 * coupling), with cookies included and every failure turned into an `ApiError` with the contract's error code.
 */
import type { AppType } from '@yeral/api'
import type { ApiErrorBody, ErrorCode } from '@yeral/contract/errors'
import { hc, parseResponse, type ClientResponse } from 'hono/client'

/** `network` = no answer (offline, DNS, CORS); the UI shows `errors.network` with a retry. */
export type ApiErrorCode = ErrorCode | 'network'

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    readonly details: Record<string, unknown> = {},
  ) {
    super(code)
    this.name = 'ApiError'
  }
}

export const isApiError = (e: unknown, code?: ApiErrorCode): e is ApiError => e instanceof ApiError && (!code || e.code === code)

export interface ClientOptions {
  /** The api origin from `@yeral/lib/site` (`site.urls.api`). */
  baseUrl: string
  /** Server-side rendering passes its own fetch (and forwards the cookie); tests pass the app. */
  fetch?: typeof fetch
  headers?: () => Record<string, string>
}

export function createClient(opts: ClientOptions) {
  const doFetch = opts.fetch ?? fetch
  return hc<AppType>(opts.baseUrl, {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        return await doFetch(input, { ...init, credentials: 'include' })
      } catch {
        throw new ApiError(0, 'network')
      }
    },
    ...(opts.headers ? { headers: opts.headers } : {}),
  })
}

export type Client = ReturnType<typeof createClient>

/** Await a client call: the success body, typed by the route; otherwise an `ApiError`. */
export async function call<T extends ClientResponse<unknown>>(request: T | Promise<T>) {
  let res: T
  try {
    res = await request
  } catch (e) {
    throw e instanceof ApiError ? e : new ApiError(0, 'network')
  }
  if (!res.ok) {
    let body: Partial<ApiErrorBody> | undefined
    try {
      body = (await res.json()) as Partial<ApiErrorBody>
    } catch {
      body = undefined
    }
    throw new ApiError(res.status, body?.error?.code ?? 'internal', body?.error?.details ?? {})
  }
  return parseResponse(res)
}

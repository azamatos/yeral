/**
 * What a demo account may do (book F-242): try the demo workspace and nothing else. Its session reads what anyone
 * reads, its own `me` and workspaces and the live events, signs out or in as someone else; in the demo workspace it
 * works as the owner, but invites nobody, uploads no files, doesn't leave it, send it for review or report a review to
 * the Ýeral team; and every number it types is in the market's unused range, so no visitor sees another's (S-20).
 * The rule is the account's, so a demo number typed into the sign-in gets no more.
 */
import { MARKET } from '@yeral/domain/market'
import { isPhone, toE164 } from '@yeral/domain/phone'
import type { MiddlewareHandler } from 'hono'
import { SANDBOX_SLUG } from '../../db/seed'
import type { AppEnv } from '../../http/env'
import { ApiError } from '../../http/errors'

const WORKSPACE = `/v1/w/${SANDBOX_SLUG}`
/** Its own `me`, its workspaces and the live events; the sign-in's steps, to sign in as someone else. */
const OWN = [/^\/v1\/me$/, /^\/v1\/me\/workspaces$/, /^\/v1\/events$/]
const SIGN_IN = /^\/v1\/(auth|demo)\//
/** Changes in the demo workspace that reach beyond it: invites, files on the disk, the Ýeral team's queues, leaving. */
const BEYOND = [
  /^\/(leave|verification|setup)(\/|$)/,
  /^\/team\/(invites|[^/]+\/invite|[^/]+\/photo)$/,
  /^\/settings\/(photos|logo)(\/|$)/,
  /^\/reviews\/[^/]+\/report$/,
]
const NUMBERS = `+${MARKET.phone.countryCode}${MARKET.phone.unusedPrefix}`

/** Every `phone` value in a request body, however deep. */
function phonesIn(body: unknown): string[] {
  if (Array.isArray(body)) return body.flatMap(phonesIn)
  if (!body || typeof body !== 'object') return []
  return Object.entries(body).flatMap(([k, v]) => (k === 'phone' && typeof v === 'string' ? [v] : phonesIn(v)))
}

export const demoGuard: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!c.var.auth?.user.demo) return next()
  const { path, method } = c.req
  if (SIGN_IN.test(path) || (method === 'GET' && OWN.some((p) => p.test(path)))) return next()
  if (path === WORKSPACE || path.startsWith(`${WORKSPACE}/`)) {
    const rest = path.slice(WORKSPACE.length)
    if (method === 'GET') return next()
    if (BEYOND.some((p) => p.test(rest))) throw new ApiError('not_in_demo')
    if (c.req.header('content-type')?.includes('application/json')) {
      // Hono keeps the parsed body, so the route's validator reads it again
      const body: unknown = await c.req.json().catch(() => null)
      if (phonesIn(body).some((p) => isPhone(p) && !toE164(p).startsWith(NUMBERS)))
        throw new ApiError('demo_number', { prefix: MARKET.phone.unusedPrefix })
    }
    return next()
  }
  // what anyone may read, outside the person's own and the Ýeral team's
  if (method === 'GET' && !/^\/v1\/(me|admin|w)(\/|$)/.test(path)) return next()
  throw new ApiError('not_in_demo')
}

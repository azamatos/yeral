/**
 * What a demo account may do (book F-242): try the demo workspace and nothing else. Its session reads what anyone
 * reads and what its own account has, follows the live events, and signs out or in as someone else; in the demo
 * workspace it reads everything and changes what an owner changes in a day's work (bookings, requests, the calendar's
 * blocks, clients, replies to reviews, services, hours, profile, rules, statuses, the team's levels, schedules and
 * people without the app). Anything else is refused, a workspace route added later included: invites, uploads,
 * leaving, setup, sending it for review, reporting a review to the Ýeral team. Every number it types, in a phone field
 * or inside a text, is in the market's unused range, so no visitor sees another's (S-20); its changes are counted per
 * address. The admin tool's routes have their own sessions and pass.
 */
import { MARKET } from '@yeral/domain/market'
import { isPhone, isUnusedNumber } from '@yeral/domain/phone'
import type { MiddlewareHandler } from 'hono'
import { SANDBOX_SLUG } from '../../db/seed'
import type { AppEnv } from '../../http/env'
import { ApiError } from '../../http/errors'
import { clientIp, hit, rateLimited } from '../../lib/rate-limit'

const WORKSPACE = `/v1/w/${SANDBOX_SLUG}`
/** Signing out, or in as someone else: the sign-in's steps, the SMS link page's, "Try the business app" again. */
const SIGN_IN = [/^\/v1\/(auth|demo)\//, /^\/v1\/links\/[^/]+\/(code|verify)$/]
/** What the business app marks as it opens the demo workspace. */
const OPENED = `/v1/me/workspaces/${SANDBOX_SLUG}/open`
/** The demo workspace's changes a visitor may try, after its address; the rest is refused. */
const DAY_TO_DAY: { path: RegExp; methods?: readonly string[] }[] = [
  { path: /^\/bookings(\/|$)/ },
  { path: /^\/calendar\/blocks(\/|$)/ },
  { path: /^\/clients(\/|$)/ },
  { path: /^\/requests\/[^/]+\/(confirm|decline)$/ },
  { path: /^\/reviews\/[^/]+\/reply$/ },
  { path: /^\/services(\/|$)/ },
  { path: /^\/settings\/(hours|profile|rules|statuses)(\/|$)/ },
  { path: /^\/team\/phone-only$/ },
  { path: /^\/team\/(?!invites$|phone-only$)[^/]+$/, methods: ['PATCH'] },
  { path: /^\/team\/[^/]+\/(remove|reactivate|schedule)$/ },
  // cancelling the design's open invite; sending one is refused
  { path: /^\/team\/[^/]+\/invite$/, methods: ['DELETE'] },
  // taking photos away or reordering them: uploading is refused
  { path: /^\/settings\/photos\/order$/, methods: ['PUT'] },
  { path: /^\/settings\/photos\/[^/]+$/, methods: ['DELETE'] },
  { path: /^\/settings\/logo$/, methods: ['DELETE'] },
  { path: /^\/team\/[^/]+\/photo$/, methods: ['DELETE'] },
]
/** JSON as the routes' validators take it (`application/json`, `…+json`, any case). */
const JSON_BODY = /^application\/([a-z-.]+\+)?json/i
/** How deep a body's texts are looked through: the routes' bodies nest two levels at most. */
const MAX_DEPTH = 6
/** Changes a demo session may make in an hour from one address: a person trying it makes a few dozen. */
export const DEMO_CHANGES_PER_HOUR = 300

const { countryCode, trunkPrefix, length } = MARKET.phone
/** A number as people write it, in a field of its own or inside a text: `+993 65 12 34 56`, `8 65…`, `65123456`. */
const NUMBER = new RegExp(
  `(?<![\\d+])(?:\\+?${countryCode}[\\s-]?)?(?:${trunkPrefix}[\\s-]?)?\\d(?:[\\s().-]?\\d){${length - 1}}(?!\\d)`,
  'g',
)
/** Whole strings that are no one's number: ids and dates. */
const NOT_TEXT = [/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, /^\d{4}-\d{2}-\d{2}$/]

/** Every text in a request body, down to `MAX_DEPTH`, ids and dates left out. */
function textsIn(body: unknown, depth = 0): string[] {
  if (typeof body === 'string') return NOT_TEXT.some((p) => p.test(body)) ? [] : [body]
  if (depth > MAX_DEPTH || !body || typeof body !== 'object') return []
  return (Array.isArray(body) ? body : Object.values(body)).flatMap((x) => textsIn(x, depth + 1))
}

/** A real person's number in what was typed: anything that reads as one of the market's, outside the unused range. */
const realNumberIn = (body: unknown) => textsIn(body).some((s) => [...s.matchAll(NUMBER)].some(([m]) => isPhone(m) && !isUnusedNumber(m)))

export const demoGuard: MiddlewareHandler<AppEnv> = async (c, next) => {
  const { path, method } = c.req
  if (!c.var.auth?.user.demo || path === '/v1/admin' || path.startsWith('/v1/admin/')) return next()
  if (SIGN_IN.some((p) => p.test(path))) return next()
  // what anyone reads, what its own account has, the live events
  if (method === 'GET' && !path.startsWith('/v1/w/')) return next()
  if (method === 'POST' && path === OPENED) return next()
  if (path === WORKSPACE || path.startsWith(`${WORKSPACE}/`)) {
    if (method === 'GET') return next()
    const rest = path.slice(WORKSPACE.length)
    if (!DAY_TO_DAY.some((r) => r.path.test(rest) && (!r.methods || r.methods.includes(method)))) throw new ApiError('not_in_demo')
    const { deps } = c.var
    const ip = clientIp((n) => c.req.header(n), deps.trustedIpHeader)
    const r = await hit(deps.db, `demo:changes:${ip}`, DEMO_CHANGES_PER_HOUR, 3600, deps.now())
    if (!r.ok) throw rateLimited(r.retryAfterSec)
    // Hono keeps the parsed body, so the route's validator reads it again
    if (JSON_BODY.test(c.req.header('content-type') ?? '') && realNumberIn(await c.req.json().catch(() => null)))
      throw new ApiError('demo_number', { prefix: MARKET.phone.unusedPrefix })
    return next()
  }
  throw new ApiError('not_in_demo')
}

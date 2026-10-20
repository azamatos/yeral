/**
 * A `fetch` that answers like the api for the site's stories (ADR 0013: contract-shaped bodies and errors, never a
 * real api). Each story makes its own with the people it needs; every mount gets a fresh copy, so a story that signs
 * someone in or out starts from the same place each time.
 */
import type { Me } from '@yeral/contract/account'

const notifications = { confirmation: true, reminderDay: true, reminder2h: true, reviewAsk: false }

/** A signed-up client (the client site's demo people, Account-Profile's Aýjemal). */
export function person(phone: string, firstName: string | null, surname: string | null = null): Me {
  return {
    id: `u-${phone}`,
    name: firstName && [firstName, surname].filter(Boolean).join(' '),
    firstName,
    surname,
    phone,
    lang: 'en',
    notifications,
    hasBusiness: false,
    // the first launch shows the sign-in code on the screen, so a number can't be changed (book Q-036)
    canChangePhone: false,
  }
}

export const AYJEMAL = person('+99365901122', 'Aýjemal', 'Gurbanowa')

export const json = (body: unknown, status = 200) =>
  new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: body === null ? {} : { 'content-type': 'application/json' },
  })
export const refuse = (status: number, code: string, details?: Record<string, unknown>) => json({ error: { code, details } }, status)

/** A request as a handler sees it: `GET /me`, the parsed body. */
export interface FakeRequest {
  route: string
  body: Record<string, unknown>
}

/** No api in the story: every request fails like a lost connection. */
export const offline = (): typeof fetch => () => Promise.reject(new TypeError('no api in this story'))

/**
 * The api over a list of handlers, tried in order; the first answer wins, anything unanswered is a 404 `not_found`.
 * `state` is the story's own copy of whatever the handlers change.
 */
export function fakeFetch(handle: (request: FakeRequest) => Response | Promise<Response> | undefined): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = new Request(input, init)
    const path = new URL(request.url).pathname.replace(/^\/v1/, '')
    const body = (request.method === 'GET' || request.method === 'DELETE' ? {} : await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >
    return (await handle({ route: `${request.method} ${path}`, body })) ?? refuse(404, 'not_found')
  }
}

/** The codes the fake hands out, one after another (the first launch shows them on the screen). */
export const CODES = ['4821', '7305', '1946', '5582', '3067']

export interface AuthApiOptions {
  /** People with an account, by E.164 phone; any other number signs up afresh (no name yet). */
  people?: Me[]
  /** Accounts unused for 6 months: "Is this you?" first (book Q-270). */
  unused?: string[]
  /** Signed in when the page opens. */
  signedIn?: Me | null
  /** First-launch mode: the code comes back with `POST /auth/code` (book Q-036). */
  showCode?: boolean
  /** Codes this number already had this hour (5 is the limit, book Q-267). */
  codes?: number
  /** How long 3 wrong codes lock (60 on the api). */
  lockSec?: number
  /** How soon a new code may be asked for (59 on the api). */
  resendSec?: number
  /** The session can't be ended (no connection). */
  logoutFails?: boolean
}

/**
 * The sign-in and the account as the api answers them: codes (3 wrong ones lock, 5 an hour, a new one after 59 s),
 * "Is this you?", the name (`PATCH /me`), who is signed in, logging out.
 */
export const authApi =
  ({
    people = [],
    unused = [],
    signedIn = null,
    showCode = true,
    codes = 0,
    lockSec = 60,
    resendSec = 59,
    logoutFails = false,
  }: AuthApiOptions = {}) =>
  (): typeof fetch => {
    const accounts = new Map(people.map((p) => [p.phone, structuredClone(p)]))
    let me: Me | null = signedIn && structuredClone(signedIn)
    let sent = codes
    let sentAt = 0
    let wrong = 0
    let phone: string | undefined
    const code = () => CODES[(sent - 1) % CODES.length]
    return fakeFetch(({ route, body }) => {
      if (route === 'POST /auth/code') {
        if (sent >= 5) return refuse(429, 'rate_limited', { retryAfterSec: 2520, retryAfterMin: 42 })
        if (body.phone === phone && Date.now() - sentAt < resendSec * 1000) return refuse(429, 'resend_too_soon', { retryAfterSec: 50 })
        phone = String(body.phone)
        sentAt = Date.now()
        sent += 1
        wrong = 0
        return json({ resendAfterSec: resendSec, expiresInSec: 300, ...(showCode ? { code: code() } : {}) })
      }
      if (route === 'POST /auth/verify') {
        if (wrong >= 3) return refuse(429, 'too_many_attempts', { retryAfterSec: lockSec })
        if (body.code !== code()) {
          wrong += 1
          return wrong >= 3
            ? refuse(429, 'too_many_attempts', { retryAfterSec: lockSec })
            : refuse(400, 'code_invalid', { attemptsLeft: 3 - wrong })
        }
        const number = String(body.phone)
        if (unused.includes(number))
          return json({ isThisYou: { name: accounts.get(number)?.firstName ?? null, ticket: 'ticket-1234567890' } }, 202)
        me = accounts.get(number) ?? person(number, null)
        accounts.set(number, me)
        return json({ me, isNew: !me.firstName })
      }
      if (route === 'POST /auth/identity') {
        if (!phone) return refuse(400, 'code_expired')
        me = body.yes ? (accounts.get(phone) ?? person(phone, null)) : person(phone, null)
        accounts.set(phone, me)
        return json({ me, isNew: !me.firstName })
      }
      if (route === 'POST /auth/logout') {
        if (logoutFails) return Promise.reject(new TypeError('offline'))
        me = null
        return json(null, 204)
      }
      if (route === 'GET /me') return me ? json(me) : refuse(401, 'unauthorized')
      // the person's own routes need someone signed in; anything else this fake doesn't know is a 404, as on the api
      if (!me)
        return route === 'PATCH /me' || route.startsWith('DELETE /me') || route.startsWith('POST /me/')
          ? refuse(401, 'unauthorized')
          : undefined
      if (route === 'PATCH /me') {
        const firstName = typeof body.firstName === 'string' ? body.firstName : me.firstName
        const surname = body.surname === undefined ? me.surname : ((body.surname as string | null) ?? null)
        me = { ...me, firstName, surname, name: [firstName, surname].filter(Boolean).join(' ') || null }
        accounts.set(me.phone, me)
        return json(me)
      }
      return undefined
    })
  }

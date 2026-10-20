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

/**
 * The account side of the api: who is signed in (`GET /me`) and logging out. `signedIn`: the person when the page
 * opens; `logoutFails`: the session can't be ended (no connection).
 */
export const accountApi =
  ({ signedIn = null, logoutFails = false }: { signedIn?: Me | null; logoutFails?: boolean } = {}) =>
  (): typeof fetch => {
    let me: Me | null = signedIn && structuredClone(signedIn)
    return fakeFetch(({ route }) => {
      if (route === 'GET /me') return me ? json(me) : refuse(401, 'unauthorized')
      if (route === 'POST /auth/logout') {
        if (logoutFails) return Promise.reject(new TypeError('offline'))
        me = null
        return json(null, 204)
      }
      return undefined
    })
  }

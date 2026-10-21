/** The Ýeral team's sign-in and accounts (ADR 0026; book F-178, Q-011). */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, site, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { rateLimits } from '../../db/schema'
import { seed } from '../../db/seed'
import { stepOf, totpAt } from '../../lib/totp'
import { inviteOrReset, LOCK_MINUTES, MAX_FAILED_SIGN_INS } from './accounts'

const PASSWORD = 'a long enough password'

/** The secret as the setup gives it to the app (base32), back to bytes. */
function fromBase32(text: string): Uint8Array<ArrayBuffer> {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const out: number[] = []
  let bits = 0
  let value = 0
  for (const ch of text) {
    value = (value << 5) | alphabet.indexOf(ch)
    bits += 5
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff)
      bits -= 8
    }
  }
  return new Uint8Array(out)
}

describe('the Ýeral team’s accounts (ADR 0026)', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
  })
  beforeEach(async () => {
    await db.delete(rateLimits)
    t = testApp(db)
  })
  /** A browser on the admin tool's site. */
  const cms = () => {
    const b = browser(t.app)
    return {
      ...b,
      req: (path: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) =>
        b.req(path, { ...init, headers: { Origin: site.urls.cms, ...init.headers } }),
    }
  }
  const tokenOf = (url: string) => url.slice(url.lastIndexOf('/') + 1)
  /** An account set up from the server command's link, signed in on `b`; its secret for the codes to come. */
  async function setUp(b: ReturnType<typeof cms>, login: string, name = 'Team member') {
    const link = await inviteOrReset(t.deps, login, name)
    const secret = fromBase32((await b.req(`/v1/admin/setup/${tokenOf(link.url)}/password`, { body: { password: PASSWORD } })).json.secret)
    const confirmed = await b.req(`/v1/admin/setup/${tokenOf(link.url)}/confirm`, {
      body: { code: await totpAt(secret, stepOf(t.clock.now)) },
    })
    expect(confirmed.status).toBe(200)
    return { secret, codes: confirmed.json.codes as string[], link }
  }
  const signIn = (b: ReturnType<typeof cms>, login: string, code: string, password = PASSWORD) =>
    b.req('/v1/admin/sign-in', { body: { login, password, code } })

  it('from the setup link: a password, the app’s first code, then signed in with 10 recovery codes; the link is used', async () => {
    const b = cms()
    const link = await inviteOrReset(t.deps, 'azamat', 'Azamat')
    expect(link).toMatchObject({ reset: false, url: `${site.urls.cms}/setup/${tokenOf(link.url)}` })
    const token = tokenOf(link.url)
    expect((await b.req(`/v1/admin/setup/${token}`)).json).toEqual({ login: 'azamat', name: 'Azamat' })
    expect((await b.req(`/v1/admin/setup/${token}/password`, { body: { password: 'short' } })).status).toBe(400)
    const chosen = await b.req(`/v1/admin/setup/${token}/password`, { body: { password: PASSWORD } })
    expect(chosen.json.uri).toBe(
      `otpauth://totp/%C3%9Deral:azamat?secret=${chosen.json.secret}&issuer=%C3%9Deral&algorithm=SHA1&digits=6&period=30`,
    )
    const secret = fromBase32(chosen.json.secret)
    // the app's code, not any 6 digits
    const wrong = await b.req(`/v1/admin/setup/${token}/confirm`, { body: { code: '000000' } })
    expect(wrong.json.error.code).toBe('admin_code_wrong')
    const confirmed = await b.req(`/v1/admin/setup/${token}/confirm`, { body: { code: await totpAt(secret, stepOf(t.clock.now)) } })
    expect(confirmed.json.codes).toHaveLength(10)
    expect(confirmed.json.codes[0]).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}$/)
    expect((await b.req('/v1/admin/me')).json).toMatchObject({ login: 'azamat', name: 'Azamat', recoveryCodesLeft: 10 })
    expect((await b.req(`/v1/admin/setup/${token}`)).json.error.code).toBe('setup_expired')
    // a link runs out after 24 hours
    const late = await inviteOrReset(t.deps, 'late', 'Late')
    t.clock.now += 24 * 3_600_000 + 1
    expect((await b.req(`/v1/admin/setup/${tokenOf(late.url)}`)).status).toBe(404)
  })

  it('signing in takes all three; any wrong part is the same refusal; a code works once', async () => {
    const { secret, codes } = await setUp(cms(), 'maya')
    const b = cms()
    const now = stepOf(t.clock.now)
    expect((await signIn(b, 'maya', await totpAt(secret, now + 1), 'wrong password')).json.error.code).toBe('sign_in_failed')
    expect((await signIn(b, 'maya', '123456')).json.error.code).toBe('sign_in_failed')
    expect((await signIn(b, 'nobody', await totpAt(secret, now + 1))).json.error.code).toBe('sign_in_failed')
    // the code the setup used is spent; the next one works, once
    expect((await signIn(b, 'maya', await totpAt(secret, now))).json.error.code).toBe('sign_in_failed')
    const signed = await signIn(b, ' Maya ', await totpAt(secret, now + 1))
    expect(signed.status).toBe(200)
    expect(signed.headers.get('set-cookie')).toMatch(/yeral-local\.admin=.+; Path=\/v1\/admin; Expires=.+; HttpOnly; SameSite=Strict/)
    expect((await signIn(cms(), 'maya', await totpAt(secret, now + 1))).json.error.code).toBe('sign_in_failed')
    expect((await b.req('/v1/admin/sign-out', { method: 'POST' })).status).toBe(204)
    expect((await b.req('/v1/admin/me')).status).toBe(401)
    // a recovery code instead of the app, once
    expect((await signIn(b, 'maya', codes[0]!.toUpperCase())).status).toBe(200)
    expect((await b.req('/v1/admin/me')).json.recoveryCodesLeft).toBe(9)
    expect((await signIn(cms(), 'maya', codes[0]!)).json.error.code).toBe('sign_in_failed')
  })

  it('10 wrong in a row lock the account for 15 minutes', async () => {
    const { secret } = await setUp(cms(), 'lock.me')
    const b = cms()
    for (let i = 0; i < MAX_FAILED_SIGN_INS; i++) expect((await signIn(b, 'lock.me', '000000')).json.error.code).toBe('sign_in_failed')
    const locked = await signIn(b, 'lock.me', await totpAt(secret, stepOf(t.clock.now) + 1))
    expect(locked.json.error).toMatchObject({ code: 'too_many_attempts', details: { retryAfterSec: LOCK_MINUTES * 60 } })
    t.clock.now += LOCK_MINUTES * 60_000
    expect((await signIn(b, 'lock.me', await totpAt(secret, stepOf(t.clock.now)))).status).toBe(200)
  })

  it('a phone never opens the admin tool, and no other site can use an admin’s cookie', async () => {
    const owner = browser(t.app)
    await owner.login('+99365102030')
    expect((await owner.req('/v1/admin/me', { headers: { Origin: site.urls.cms } })).status).toBe(401)
    const b = cms()
    await setUp(b, 'origin')
    expect((await b.req('/v1/admin/me')).status).toBe(200)
    expect((await b.req('/v1/admin/me', { headers: { Origin: site.urls.client } })).status).toBe(403)
    expect((await b.req('/v1/admin/me', { headers: { Origin: site.urls.business } })).status).toBe(403)
  })

  it('the team invites, resets and turns off one another; never one’s own', async () => {
    const lead = cms()
    const mine = await setUp(lead, 'lead', 'Lead')
    const invited = await lead.req('/v1/admin/team', { body: { login: 'New.One', name: 'New one' } })
    expect(invited.status).toBe(201)
    expect((await lead.req('/v1/admin/team', { body: { login: 'new.one', name: 'Again' } })).json.error.code).toBe('login_taken')
    expect((await lead.req('/v1/admin/team', { body: { login: 'x', name: 'Too short' } })).status).toBe(400)
    const team = (await lead.req('/v1/admin/team')).json.items as { login: string; status: string; invitedBy: string | null }[]
    expect(team.find((m) => m.login === 'new.one')).toMatchObject({ status: 'invited', invitedBy: 'Lead' })
    // the new one sets up, then loses their phone: a reset ends their sessions, and their old password is gone
    const other = cms()
    const secret = fromBase32(
      (await other.req(`/v1/admin/setup/${tokenOf(invited.json.url)}/password`, { body: { password: PASSWORD } })).json.secret,
    )
    await other.req(`/v1/admin/setup/${tokenOf(invited.json.url)}/confirm`, { body: { code: await totpAt(secret, stepOf(t.clock.now)) } })
    expect((await other.req('/v1/admin/me')).status).toBe(200)
    const reset = await lead.req(`/v1/admin/team/${invited.json.id}/reset`, { method: 'POST' })
    expect(reset.json.url).not.toBe(invited.json.url)
    expect((await other.req('/v1/admin/me')).status).toBe(401)
    expect((await signIn(cms(), 'new.one', await totpAt(secret, stepOf(t.clock.now) + 1))).json.error.code).toBe('sign_in_failed')
    // turned off: no sign-in, its link gone
    expect((await lead.req(`/v1/admin/team/${invited.json.id}/disable`, { method: 'POST' })).status).toBe(204)
    expect((await other.req(`/v1/admin/setup/${tokenOf(reset.json.url)}`)).status).toBe(404)
    // not one's own
    expect((await lead.req(`/v1/admin/team/${mine.link.id}/disable`, { method: 'POST' })).status).toBe(403)
    expect((await lead.req(`/v1/admin/team/${mine.link.id}/reset`, { method: 'POST' })).status).toBe(403)
    // the server command brings a login back with a new link
    expect(await inviteOrReset(t.deps, 'new.one', 'New one')).toMatchObject({ reset: true })
  })

  it('a new password ends the other sessions; new recovery codes replace the old', async () => {
    const first = cms()
    const { secret, codes } = await setUp(first, 'pass')
    const second = cms()
    await signIn(second, 'pass', await totpAt(secret, stepOf(t.clock.now) + 1))
    const wrong = await second.req('/v1/admin/me/password', {
      method: 'PUT',
      body: { password: 'not it', newPassword: 'another long password' },
    })
    expect(wrong.status).toBe(400)
    expect(
      (await second.req('/v1/admin/me/password', { method: 'PUT', body: { password: PASSWORD, newPassword: 'another long password' } }))
        .status,
    ).toBe(204)
    expect((await first.req('/v1/admin/me')).status).toBe(401)
    expect((await second.req('/v1/admin/me')).status).toBe(200)
    t.clock.now += 60_000
    const renewed = await second.req('/v1/admin/me/recovery-codes', { body: { code: await totpAt(secret, stepOf(t.clock.now)) } })
    expect(renewed.json.codes).toHaveLength(10)
    expect((await signIn(cms(), 'pass', codes[1]!, 'another long password')).json.error.code).toBe('sign_in_failed')
    expect((await signIn(cms(), 'pass', renewed.json.codes[0], 'another long password')).status).toBe(200)
  })

  it('a server without ADMIN_SECRET_KEY has no admin tool', async () => {
    const off = testApp(db, { adminKey: null })
    const b = browser(off.app)
    const res = await b.req('/v1/admin/sign-in', {
      body: { login: 'azamat', password: PASSWORD, code: '000000' },
      headers: { Origin: site.urls.cms },
    })
    expect(res.status).toBe(503)
    expect(res.json.error.code).toBe('admin_unavailable')
  })
})

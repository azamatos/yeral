/** The Ýeral team's sign-in and accounts (ADR 0026, amended 2026-11-06; book F-178, Q-011). */
import { asc, eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, site, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { adminActions, adminChallenges, admins, rateLimits } from '../../db/schema'
import { seed } from '../../db/seed'
import { sha256Hex } from '../../lib/crypto'
import { stepOf, totpAt } from '../../lib/totp'
import { nullLogger } from '../../ports/log'
import {
  ADMIN_TRIES_PER_ADDRESS,
  ADMIN_TRIES_PER_LOGIN,
  CHALLENGE_MINUTES,
  CODE_MISSES_PER_ACCOUNT,
  CODE_TRIES_PER_CHALLENGE,
  inviteOrReset,
} from './accounts'

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

type Headers = Record<string, string>

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
      req: (path: string, init: { method?: string; body?: unknown; headers?: Headers } = {}) =>
        b.req(path, { ...init, headers: { Origin: site.urls.cms, ...init.headers } }),
      get cookie() {
        return b.cookie
      },
    }
  }
  type Cms = ReturnType<typeof cms>
  const tokenOf = (url: string) => url.slice(url.lastIndexOf('/') + 1)
  /** An account set up from the server command's link, signed in on `b`; its secret for the codes to come. */
  async function setUp(b: Cms, login: string, name = 'Team member') {
    const link = await inviteOrReset(t.deps, login, name)
    const secret = fromBase32((await b.req(`/v1/admin/setup/${tokenOf(link.url)}/password`, { body: { password: PASSWORD } })).json.secret)
    const confirmed = await b.req(`/v1/admin/setup/${tokenOf(link.url)}/confirm`, {
      body: { code: await totpAt(secret, stepOf(t.clock.now)) },
    })
    expect(confirmed.status).toBe(200)
    return { secret, codes: confirmed.json.codes as string[], link }
  }
  /** Step 1: the login and the password. */
  const start = (b: Cms, login: string, password = PASSWORD, headers?: Headers) =>
    b.req('/v1/admin/sign-in', { body: { login, password }, headers })
  /** Step 2: the code for a challenge (the first step's answer, or a token). */
  const code = (b: Cms, challenge: { json: { challenge: string } } | string, theCode: string, headers?: Headers) =>
    b.req('/v1/admin/sign-in/code', {
      body: { challenge: typeof challenge === 'string' ? challenge : challenge.json.challenge, code: theCode },
      headers,
    })
  const challengesOf = (adminId: string) => db.select().from(adminChallenges).where(eq(adminChallenges.adminId, adminId))
  /** Both steps; a first step refused is the answer. */
  const signIn = async (b: Cms, login: string, theCode: string, password = PASSWORD, headers?: Headers) => {
    const started = await start(b, login, password, headers)
    return started.status === 200 ? code(b, started, theCode, headers) : started
  }

  it('from the setup link: a password, the app’s first code, then signed in with 10 recovery codes; the link is used', async () => {
    const b = cms()
    const link = await inviteOrReset(t.deps, 'azamat', 'Azamat')
    // the first account ever is the superadmin
    expect(link).toMatchObject({ reset: false, role: 'superadmin', url: `${site.urls.cms}/setup/${tokenOf(link.url)}` })
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
    expect((await b.req('/v1/admin/me')).json).toMatchObject({ login: 'azamat', name: 'Azamat', role: 'superadmin', recoveryCodesLeft: 10 })
    expect((await b.req(`/v1/admin/setup/${token}`)).json.error.code).toBe('setup_expired')
    // a link runs out after 24 hours; a later account is an admin
    const late = await inviteOrReset(t.deps, 'late', 'Late')
    expect(late.role).toBe('admin')
    t.clock.now += 24 * 3_600_000 + 1
    expect((await b.req(`/v1/admin/setup/${tokenOf(late.url)}`)).status).toBe(404)
  })

  it('signing in takes two steps: the login and the password, then the code for their challenge; a code works once', async () => {
    const { secret, codes, link } = await setUp(cms(), 'maya')
    const b = cms()
    const now = stepOf(t.clock.now)
    // step 1: a wrong password or an unknown login is one refusal, and no challenge
    expect((await start(b, 'maya', 'wrong password')).json.error.code).toBe('sign_in_failed')
    expect((await start(b, 'nobody')).json.error.code).toBe('sign_in_failed')
    expect(await challengesOf(link.id)).toHaveLength(0)
    // the right password: a challenge for 5 minutes, nobody signed in yet, only its hash kept
    const started = await start(b, ' Maya ')
    expect(started.status).toBe(200)
    expect(started.json).toMatchObject({ login: 'maya', expiresAt: t.clock.now + CHALLENGE_MINUTES * 60_000 })
    expect(started.headers.get('set-cookie')).toBeNull()
    expect((await b.req('/v1/admin/me')).status).toBe(401)
    expect((await challengesOf(link.id)).map((c) => c.tokenHash)).toEqual([await sha256Hex(started.json.challenge)])
    // step 2: a wrong code stays on the step; the code the setup used is spent; the next one works, once
    const wrong = await code(b, started, '123456')
    expect(wrong.status).toBe(400)
    expect(wrong.json.error.code).toBe('admin_code_wrong')
    expect((await code(b, started, await totpAt(secret, now))).json.error.code).toBe('admin_code_wrong')
    const signed = await code(b, started, await totpAt(secret, now + 1))
    expect(signed.status).toBe(200)
    expect(signed.json).toMatchObject({ login: 'maya', role: 'admin' })
    expect(signed.headers.get('set-cookie')).toMatch(/yeral-local\.admin=.+; Path=\/v1\/admin; Expires=.+; HttpOnly; SameSite=Strict/)
    expect(await challengesOf(link.id)).toHaveLength(0)
    expect((await signIn(cms(), 'maya', await totpAt(secret, now + 1))).json.error.code).toBe('admin_code_wrong')
    expect((await b.req('/v1/admin/sign-out', { method: 'POST' })).status).toBe(204)
    expect((await b.req('/v1/admin/me')).status).toBe(401)
    // a recovery code instead of the app, once
    expect((await signIn(b, 'maya', codes[0]!.toUpperCase())).status).toBe(200)
    expect((await b.req('/v1/admin/me')).json.recoveryCodesLeft).toBe(9)
    expect((await signIn(cms(), 'maya', codes[0]!)).json.error.code).toBe('admin_code_wrong')
    // kept keyed and per account: a copy of the database has nothing to try codes against
    const [row] = await db.select().from(admins).where(eq(admins.login, 'maya'))
    expect(row!.recoveryCodes).toHaveLength(9)
    expect(row!.recoveryCodes).not.toContain(await sha256Hex(`recovery:${codes[1]!.replace('-', '')}`))
  })

  it('a challenge takes 5 wrong codes, runs out after 5 minutes, works once and goes with a reset: back to step 1', async () => {
    const { secret, link } = await setUp(cms(), 'tries')
    const b = cms()
    const spent = await start(b, 'tries')
    for (let i = 1; i < CODE_TRIES_PER_CHALLENGE; i++) expect((await code(b, spent, '000000')).json.error.code).toBe('admin_code_wrong')
    const last = await code(b, spent, '000000')
    expect(last.status).toBe(401)
    expect(last.json.error.code).toBe('sign_in_expired')
    // even the right code now
    expect((await code(b, spent, await totpAt(secret, stepOf(t.clock.now) + 1))).json.error.code).toBe('sign_in_expired')
    // one that ran out
    const late = await start(b, 'tries')
    t.clock.now += CHALLENGE_MINUTES * 60_000 + 1
    expect((await code(b, late, await totpAt(secret, stepOf(t.clock.now)))).json.error.code).toBe('sign_in_expired')
    // one used: the next sign-in needs its own
    const used = await start(b, 'tries')
    expect((await code(b, used, await totpAt(secret, stepOf(t.clock.now)))).status).toBe(200)
    expect((await code(cms(), used, await totpAt(secret, stepOf(t.clock.now) + 1))).json.error.code).toBe('sign_in_expired')
    // one that never was: the same answer
    expect((await code(cms(), 'A'.repeat(43), '000000')).json.error.code).toBe('sign_in_expired')
    // a reset meanwhile takes the account's challenges with its sessions
    const reset = await start(cms(), 'tries')
    expect(await inviteOrReset(t.deps, 'tries', 'Tries')).toMatchObject({ reset: true })
    expect((await code(cms(), reset, await totpAt(secret, stepOf(t.clock.now) + 2))).json.error.code).toBe('sign_in_expired')
    expect(await challengesOf(link.id)).toHaveLength(0)
  })

  it('a code and a reset at once: one waits for the other (the account is held first, then the challenge), neither fails', async () => {
    const { secret } = await setUp(cms(), 'crossed')
    const b = cms()
    const started = await start(b, 'crossed')
    const [signed, reset] = await Promise.all([
      code(b, started, await totpAt(secret, stepOf(t.clock.now) + 1)),
      inviteOrReset(t.deps, 'crossed', 'Crossed'),
    ])
    expect(reset).toMatchObject({ reset: true })
    // in just before the reset, which then ended the session, or sent back to step 1: never a deadlock's 500
    expect([200, 401]).toContain(signed.status)
    if (signed.status === 401) expect(signed.json.error.code).toBe('sign_in_expired')
    expect((await b.req('/v1/admin/me')).status).toBe(401)
  })

  it('wrong codes after the right password are counted per account, from anywhere: the hour holds it', async () => {
    t = testApp(db, { trustedIpHeader: 'x-forwarded-for' })
    const alerts: string[] = []
    t.deps.log = { ...nullLogger, error: (message) => alerts.push(message) }
    const { secret } = await setUp(cms(), 'guessed')
    const from = (n: number, theCode: string) => signIn(cms(), 'guessed', theCode, PASSWORD, { 'X-Forwarded-For': `10.0.1.${n}` })
    for (let i = 0; i < CODE_MISSES_PER_ACCOUNT; i++) expect((await from(i, '000000')).json.error.code).toBe('admin_code_wrong')
    // the miss that filled the hour is said once, for the alerts
    expect(alerts).toEqual(['admin codes guessed with the right password: the account is held for the hour'])
    // held: the password step says so, from yet another address, even with the right code to come
    const held = await from(99, await totpAt(secret, stepOf(t.clock.now) + 1))
    expect(held.status).toBe(429)
    expect(held.json.error.code).toBe('rate_limited')
    expect(held.json.error.details.retryAfterMin).toBe(60)
    // a wrong password still reads the same as ever: the hold shows only to someone with the password
    expect((await start(cms(), 'guessed', 'not it', { 'X-Forwarded-For': '10.0.1.98' })).json.error.code).toBe('sign_in_failed')
    t.clock.now += 3_600_000
    expect((await from(100, await totpAt(secret, stepOf(t.clock.now)))).status).toBe(200)
    // a wrong password doesn't count toward it
    expect(CODE_MISSES_PER_ACCOUNT).toBeLessThan(ADMIN_TRIES_PER_ADDRESS)
  })

  it('one code, two sign-ins at once: one is in', async () => {
    const { secret } = await setUp(cms(), 'twice')
    const theCode = await totpAt(secret, stepOf(t.clock.now) + 1)
    const [a, b] = [cms(), cms()]
    const [ca, cb] = [await start(a, 'twice'), await start(b, 'twice')]
    const both = await Promise.all([code(a, ca, theCode), code(b, cb, theCode)])
    expect(both.map((r) => r.status).sort()).toEqual([200, 400])
    // one challenge, two at once: one is in (a minute on, for a code the app hasn't shown yet)
    t.clock.now += 60_000
    const c = cms()
    const shared = await start(c, 'twice')
    const next = await totpAt(secret, stepOf(t.clock.now) + 1)
    const same = await Promise.all([code(c, shared, next), code(cms(), shared, next)])
    expect(same.map((r) => r.status).sort()).toEqual([200, 401])
  })

  // about 32 password checks at 600,000 rounds: past the 20 s default on a busy CI runner
  it('tries are limited per address and per login from it, a real login like an unknown one; elsewhere its owner signs in', async () => {
    t = testApp(db, { trustedIpHeader: 'x-forwarded-for' })
    const { secret } = await setUp(cms(), 'limits')
    const from = (ip: string) => {
      const b = cms()
      // a guesser without the password; the owner with it
      return (login: string, theCode = '000000', password = 'a guessed password') =>
        signIn(b, login, theCode, password, { 'X-Forwarded-For': ip })
    }
    const guess = from('10.0.0.1')
    for (let i = 0; i < ADMIN_TRIES_PER_LOGIN; i++) {
      expect((await guess('limits')).json.error.code).toBe('sign_in_failed')
      expect((await guess('nobody.here')).json.error.code).toBe('sign_in_failed')
    }
    expect((await guess('limits')).json.error.code).toBe('rate_limited')
    expect((await guess('nobody.here')).json.error.code).toBe('rate_limited')
    // nobody elsewhere can keep the account's owner out
    expect((await from('10.0.0.2')('limits', await totpAt(secret, stepOf(t.clock.now) + 1), PASSWORD)).status).toBe(200)
    // and an address has its hour: other logins run out too
    for (let i = 2 * (ADMIN_TRIES_PER_LOGIN + 1); i < ADMIN_TRIES_PER_ADDRESS; i++) expect((await guess(`other${i}`)).status).toBe(401)
    expect((await guess('one.more')).json.error.code).toBe('rate_limited')
  }, 60_000)

  it('a phone never opens the admin tool, and no other site can use an admin’s cookie', async () => {
    const owner = browser(t.app)
    await owner.login('+99365102030')
    expect((await owner.req('/v1/admin/me', { headers: { Origin: site.urls.cms } })).status).toBe(401)
    const b = cms()
    await setUp(b, 'origin')
    expect((await b.req('/v1/admin/me')).status).toBe(200)
    expect((await b.req('/v1/admin/me', { headers: { Origin: site.urls.client } })).status).toBe(403)
    expect((await b.req('/v1/admin/me', { headers: { Origin: site.urls.business } })).status).toBe(403)
    expect(
      (await b.req('/v1/admin/team', { body: { login: 'from.client', name: 'X' }, headers: { Origin: site.urls.client } })).status,
    ).toBe(403)
    // nor a page the api serves itself (/docs): its requests carry no Origin
    expect((await t.app.request('/v1/admin/me', { headers: { cookie: b.cookie } })).status).toBe(403)
    const bare = await t.app.request('/v1/admin/team', {
      method: 'POST',
      headers: { cookie: b.cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ login: 'no.origin', name: 'X' }),
    })
    expect(bare.status).toBe(403)
  })

  it('the superadmin invites admins, resets and turns them off; admins see the team; nobody touches the superadmin (Q-011)', async () => {
    // the superadmin: the first account ever, or the one there is, set up again by the server command (its way back)
    const [top] = await db.select().from(admins).where(eq(admins.role, 'superadmin'))
    const lead = cms()
    const mine = await setUp(lead, top?.login ?? 'lead', top?.name ?? 'Lead')
    expect(mine.link).toMatchObject({ reset: top !== undefined, role: 'superadmin' })
    expect((await lead.req('/v1/admin/me')).json.role).toBe('superadmin')
    const invited = await lead.req('/v1/admin/team', { body: { login: 'New.One', name: 'New one' } })
    expect(invited.status).toBe(201)
    expect((await lead.req('/v1/admin/team', { body: { login: 'new.one', name: 'Again' } })).json.error.code).toBe('login_taken')
    expect((await lead.req('/v1/admin/team', { body: { login: 'x', name: 'Too short' } })).status).toBe(400)
    const team = (await lead.req('/v1/admin/team')).json.items as {
      login: string
      role: string
      status: string
      invitedBy: string | null
    }[]
    expect(team.find((m) => m.login === 'new.one')).toMatchObject({ role: 'admin', status: 'invited', invitedBy: top?.name ?? 'Lead' })
    expect(team.filter((m) => m.role === 'superadmin')).toHaveLength(1)
    // the new one sets up: an admin, who sees the team but changes nothing in it
    const other = cms()
    const secret = fromBase32(
      (await other.req(`/v1/admin/setup/${tokenOf(invited.json.url)}/password`, { body: { password: PASSWORD } })).json.secret,
    )
    await other.req(`/v1/admin/setup/${tokenOf(invited.json.url)}/confirm`, { body: { code: await totpAt(secret, stepOf(t.clock.now)) } })
    expect((await other.req('/v1/admin/me')).json.role).toBe('admin')
    expect((await other.req('/v1/admin/team')).status).toBe(200)
    const third = await setUp(cms(), 'third.one')
    expect((await other.req('/v1/admin/team', { body: { login: 'by.admin', name: 'By an admin' } })).json.error.code).toBe(
      'superadmin_only',
    )
    expect((await other.req(`/v1/admin/team/${third.link.id}/reset`, { method: 'POST' })).json.error.code).toBe('superadmin_only')
    expect((await other.req(`/v1/admin/team/${third.link.id}/disable`, { method: 'POST' })).json.error.code).toBe('superadmin_only')
    // nobody resets or turns off the superadmin: not an admin, not the superadmin themselves
    expect((await other.req(`/v1/admin/team/${mine.link.id}/reset`, { method: 'POST' })).json.error.code).toBe('superadmin_protected')
    expect((await other.req(`/v1/admin/team/${mine.link.id}/disable`, { method: 'POST' })).json.error.code).toBe('superadmin_protected')
    expect((await lead.req(`/v1/admin/team/${mine.link.id}/disable`, { method: 'POST' })).status).toBe(403)
    expect((await lead.req(`/v1/admin/team/${mine.link.id}/reset`, { method: 'POST' })).json.error.code).toBe('superadmin_protected')
    expect((await lead.req('/v1/admin/me')).json.role).toBe('superadmin')
    // the new one loses their phone: the superadmin's reset ends their sessions, and their old password is gone
    const reset = await lead.req(`/v1/admin/team/${invited.json.id}/reset`, { method: 'POST' })
    expect(reset.status).toBe(200)
    expect(reset.json.url).not.toBe(invited.json.url)
    expect((await other.req('/v1/admin/me')).status).toBe(401)
    expect((await signIn(cms(), 'new.one', await totpAt(secret, stepOf(t.clock.now) + 1))).json.error.code).toBe('sign_in_failed')
    // turned off: no sign-in, its link gone; the record says who did what
    expect((await lead.req(`/v1/admin/team/${invited.json.id}/disable`, { method: 'POST' })).status).toBe(204)
    expect((await other.req(`/v1/admin/setup/${tokenOf(reset.json.url)}`)).status).toBe(404)
    const done = await db.select().from(adminActions).where(eq(adminActions.targetAdminId, invited.json.id)).orderBy(asc(adminActions.at))
    expect(done.map((a) => [a.action, a.adminId === mine.link.id])).toEqual([
      ['admin.invited', true],
      ['admin.set_up', false],
      ['admin.reset', true],
      ['admin.disabled', true],
    ])
    expect(done[0]!.details).toEqual({ role: 'admin' })
    // the server command brings a login back with a new link, its role kept
    expect(await inviteOrReset(t.deps, 'new.one', 'New one')).toMatchObject({ reset: true, role: 'admin' })
    // one turned off with its password and app: refused at the first step
    const off = await setUp(cms(), 'off.one')
    expect((await lead.req(`/v1/admin/team/${off.link.id}/disable`, { method: 'POST' })).status).toBe(204)
    expect((await signIn(cms(), 'off.one', await totpAt(off.secret, stepOf(t.clock.now) + 1))).json.error.code).toBe('sign_in_failed')
  })

  it('a reset during a setup: the old link stops at every step', async () => {
    const b = cms()
    const first = await inviteOrReset(t.deps, 'midway', 'Midway')
    const token = tokenOf(first.url)
    const secret = fromBase32((await b.req(`/v1/admin/setup/${token}/password`, { body: { password: PASSWORD } })).json.secret)
    expect(await inviteOrReset(t.deps, 'midway', 'Midway')).toMatchObject({ reset: true })
    expect((await b.req(`/v1/admin/setup/${token}/password`, { body: { password: PASSWORD } })).json.error.code).toBe('setup_expired')
    const confirm = await b.req(`/v1/admin/setup/${token}/confirm`, { body: { code: await totpAt(secret, stepOf(t.clock.now)) } })
    expect(confirm.json.error.code).toBe('setup_expired')
    // a link that never was: nothing hashed, the same answer
    expect((await b.req(`/v1/admin/setup/${'A'.repeat(43)}/password`, { body: { password: PASSWORD } })).json.error.code).toBe(
      'setup_expired',
    )
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
    expect((await signIn(cms(), 'pass', codes[1]!, 'another long password')).json.error.code).toBe('admin_code_wrong')
    expect((await signIn(cms(), 'pass', renewed.json.codes[0], 'another long password')).status).toBe(200)
  })

  it('a server without ADMIN_SECRET_KEY has no admin tool', async () => {
    const off = testApp(db, { adminKey: null })
    const b = browser(off.app)
    const res = await b.req('/v1/admin/sign-in', { body: { login: 'azamat', password: PASSWORD }, headers: { Origin: site.urls.cms } })
    expect(res.status).toBe(503)
    expect(res.json.error.code).toBe('admin_unavailable')
  })

  it('a secret sealed under another key: unavailable, whatever the password', async () => {
    await setUp(cms(), 'rekeyed')
    const moved = browser(testApp(db, { adminKey: new Uint8Array(32).fill(9) }).app)
    const signInWith = (password: string) =>
      moved.req('/v1/admin/sign-in', { body: { login: 'rekeyed', password }, headers: { Origin: site.urls.cms } })
    expect((await signInWith(PASSWORD)).json.error.code).toBe('admin_unavailable')
    expect((await signInWith('not the password')).json.error.code).toBe('admin_unavailable')
  })
})

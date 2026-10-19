import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { loginCodes, rateLimits } from '../../db/schema'
import { seed } from '../../db/seed'

describe('phone login (ADR 0019)', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
  })
  beforeEach(async () => {
    await db.delete(rateLimits)
    await db.delete(loginCodes)
    t = testApp(db)
  })

  it('sends a code by SMS (1234 outside production) with a resend timer', async () => {
    const b = browser(t.app)
    const res = await b.req('/v1/auth/code', { body: { phone: '+993 65 00 00 01' } })
    expect(res.status).toBe(200)
    expect(res.json).toEqual({ resendAfterSec: 59, expiresInSec: 300 })
    // in the language of the page, else the market's main one (book Q-292)
    expect(t.sms.sent.at(-1)).toEqual({ to: '+99365000001', text: 'Ýeral code: 1234', secret: true })
    await browser(t.app).req('/v1/auth/code', { body: { phone: '+99365000011', lang: 'tk' } })
    expect(t.sms.sent.at(-1)).toEqual({ to: '+99365000011', text: 'Ýeral kody: 1234', secret: true })
    const again = await b.req('/v1/auth/code', { body: { phone: '+99365000001' } })
    expect(again.status).toBe(429)
    expect(again.json.error).toMatchObject({ code: 'resend_too_soon', details: { retryAfterSec: 59 } })
    t.clock.now += 60_000
    expect((await b.req('/v1/auth/code', { body: { phone: '+99365000001' } })).status).toBe(200)
  })

  it('only mobile numbers get codes', async () => {
    const res = await browser(t.app).req('/v1/auth/code', { body: { phone: '+993 12 45 67 89' } })
    expect(res.status).toBe(400)
    expect(res.json.error.code).toBe('validation_error')
  })

  it('counts wrong codes down, then locks for a minute and wants a new code', async () => {
    const b = browser(t.app)
    const phone = '+99365000002'
    await b.req('/v1/auth/code', { body: { phone } })
    const first = await b.req('/v1/auth/verify', { body: { phone, code: '0000' } })
    expect(first.json.error).toEqual({ code: 'code_invalid', details: { attemptsLeft: 2 } })
    expect((await b.req('/v1/auth/verify', { body: { phone, code: '0000' } })).json.error.details).toEqual({ attemptsLeft: 1 })
    const third = await b.req('/v1/auth/verify', { body: { phone, code: '0000' } })
    expect(third.status).toBe(429)
    expect(third.json.error).toEqual({ code: 'too_many_attempts', details: { retryAfterSec: 60 } })
    expect((await b.req('/v1/auth/verify', { body: { phone, code: '1234' } })).json.error.code).toBe('too_many_attempts')
    expect((await b.req('/v1/auth/code', { body: { phone } })).status).toBe(429)
    t.clock.now += 61_000
    expect((await b.req('/v1/auth/verify', { body: { phone, code: '1234' } })).json.error.code).toBe('code_expired')
    expect((await b.req('/v1/auth/code', { body: { phone } })).status).toBe(200)
    expect((await b.req('/v1/auth/verify', { body: { phone, code: '1234' } })).status).toBe(200)
  })

  it('guesses sent at once share the same three tries', async () => {
    const b = browser(t.app)
    const phone = '+99365000009'
    await b.req('/v1/auth/code', { body: { phone } })
    const tries = await Promise.all(Array.from({ length: 10 }, () => b.req('/v1/auth/verify', { body: { phone, code: '0000' } })))
    expect(tries.filter((r) => r.json.error.code === 'code_invalid')).toHaveLength(2)
    expect(tries.filter((r) => r.json.error.code === 'too_many_attempts')).toHaveLength(8)
    expect((await b.req('/v1/auth/verify', { body: { phone, code: '1234' } })).json.error.code).toBe('too_many_attempts')
  })

  it('a right code signs in once, however many requests carry it', async () => {
    const b = browser(t.app)
    const phone = '+99365000010'
    await b.req('/v1/auth/code', { body: { phone } })
    const tries = await Promise.all(Array.from({ length: 5 }, () => b.req('/v1/auth/verify', { body: { phone, code: '1234' } })))
    expect(tries.filter((r) => r.status === 200)).toHaveLength(1)
  })

  it('the per-IP limit keys on the address our proxy saw, not on headers the caller sends', async () => {
    const proxied = browser(testApp(db, { trustedIpHeader: 'x-forwarded-for' }).app)
    const send = (i: number) =>
      proxied.req('/v1/auth/code', {
        body: { phone: `+993657${String(i).padStart(5, '0')}` },
        headers: { 'cf-connecting-ip': `10.0.0.${i}`, 'x-forwarded-for': `10.9.9.${i}, 192.0.2.7` },
      })
    for (let i = 0; i < 20; i++) expect((await send(i)).status).toBe(200)
    expect((await send(20)).json.error.code).toBe('rate_limited')
  })

  it('a code expires after 5 minutes', async () => {
    const b = browser(t.app)
    await b.req('/v1/auth/code', { body: { phone: '+99365000003' } })
    t.clock.now += 301_000
    expect((await b.req('/v1/auth/verify', { body: { phone: '+99365000003', code: '1234' } })).json.error.code).toBe('code_expired')
  })

  it('signs a new person in, asks for the name, signs out', async () => {
    const b = browser(t.app)
    const first = await b.login('+99365000004')
    expect(first.isNew).toBe(true)
    // the language they signed in with, else the market's main one (English for the first launch)
    expect(first.me).toMatchObject({ phone: '+99365000004', name: null, lang: 'en', hasBusiness: false })
    expect(b.cookie).toMatch(/^yeral-local\.session=/)
    expect((await b.req('/v1/me', { method: 'PATCH', body: { name: 'Merdan Ataýew' } })).json.name).toBe('Merdan Ataýew')
    expect((await b.req('/v1/auth/logout', { method: 'POST' })).status).toBe(204)
    expect((await b.req('/v1/me')).status).toBe(401)
  })

  it('a known person keeps their account; a team member gets the workspace link', async () => {
    const client = await browser(t.app).login('+99365901122')
    expect(client.isNew).toBe(false)
    expect(client.me.name).toBe('Aýjemal Gurbanowa')
    const owner = await browser(t.app).login('+99365102030')
    expect(owner.me.hasBusiness).toBe(true)
  })
})

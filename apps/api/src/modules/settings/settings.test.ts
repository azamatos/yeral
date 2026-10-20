/** Business settings (book B-41, B-42): the booking rules the owner and administrators set. */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser, eventsAfter } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { rateLimits } from '../../db/schema'
import { seed } from '../../db/seed'

// the demo team of Glow Studio
const MAYSA = '+99365102030' // owner
const SELBI = '+99365884102' // administrator
const AYNA = '+99365312210' // specialist
const RULES = '/v1/w/glow-studio/settings/rules'

describe('booking rules (book B-41, B-42)', () => {
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
  const as = async (phone: string, name?: string) => {
    const b = browser(t.app)
    await b.login(phone, name)
    return b
  }

  it('the owner and an administrator read and change them; a specialist can’t, an outsider doesn’t see the workspace', async () => {
    const maysa = await as(MAYSA)
    const rules = await maysa.req(RULES)
    expect(rules.status).toBe(200)
    expect(rules.json).toEqual({
      onlineEnabled: true,
      confirmMode: 'manual',
      requestAnswerers: 'both',
      holdMinutes: 30,
      leadMinutes: 60,
      windowDays: 30,
      bufferMinutes: 10,
      slotStep: 15,
      cancelWindowMinutes: 120,
      askCancelReason: true,
      blockAfterNoShows: 2,
      lateMinutes: 15,
    })
    const selbi = await as(SELBI)
    const changed = await selbi.req(RULES, { method: 'PATCH', body: { askCancelReason: false, requestAnswerers: 'desk' } })
    expect(changed.status).toBe(200)
    expect(changed.json).toMatchObject({ askCancelReason: false, requestAnswerers: 'desk', holdMinutes: 30 })
    expect((await maysa.req(RULES)).json).toMatchObject({ askCancelReason: false, requestAnswerers: 'desk' })
    await maysa.req(RULES, { method: 'PATCH', body: { askCancelReason: true, requestAnswerers: 'both' } })

    const ayna = await as(AYNA)
    expect((await ayna.req(RULES)).json.error.code).toBe('forbidden')
    expect((await ayna.req(RULES, { method: 'PATCH', body: { holdMinutes: 60 } })).status).toBe(403)
    const stranger = await as('+99365700001', 'Stranger')
    expect((await stranger.req(RULES)).status).toBe(404)
  })

  it('only the values the settings offer: anything else names the field', async () => {
    const maysa = await as(MAYSA)
    const bad = await maysa.req(RULES, { method: 'PATCH', body: { holdMinutes: 45, bufferMinutes: 121 } })
    expect(bad.status).toBe(400)
    expect(bad.json.error).toMatchObject({ code: 'validation_error', details: { holdMinutes: 'invalid', bufferMinutes: 'invalid' } })
    // lateness is fixed in the MVP (book Q-118), and nothing else is a rule
    expect((await maysa.req(RULES, { method: 'PATCH', body: { lateMinutes: 30 } })).status).toBe(400)
    // a custom buffer and "any time" are offered
    const ok = await maysa.req(RULES, { method: 'PATCH', body: { bufferMinutes: 7, cancelWindowMinutes: null } })
    expect(ok.json).toMatchObject({ bufferMinutes: 7, cancelWindowMinutes: null })
    await maysa.req(RULES, { method: 'PATCH', body: { bufferMinutes: 10, cancelWindowMinutes: 120 } })
  })

  it('a change reaches the client page and the team; waiting requests keep their timers (book Q-205)', async () => {
    const client = await as('+99365700002', 'Client')
    const page = (await client.req('/v1/businesses/glow-studio')).json
    const service = page.serviceGroups[0].services[0].id as string
    const FRI = '2026-10-16'
    const free = (await client.req(`/v1/businesses/glow-studio/availability?services=${service}&staff=any&date=${FRI}`)).json.slots
    const made = await client.req('/v1/bookings', {
      body: { type: 'appointment', business: 'glow-studio', serviceIds: [service], staffId: null, date: FRI, start: free.at(-1).start },
    })
    expect(made.json.status).toBe('pending')

    const ayna = await as(AYNA)
    const cursor = (await ayna.req('/v1/events')).json.cursor
    const maysa = await as(MAYSA)
    const changed = await maysa.req(RULES, { method: 'PATCH', body: { confirmMode: 'instant', holdMinutes: 120, onlineEnabled: false } })
    expect(changed.status).toBe(200)
    try {
      const after = (await client.req('/v1/businesses/glow-studio')).json
      expect(after).toMatchObject({ confirmMode: 'instant', holdMinutes: 120, onlineEnabled: false })
      // the request sent before waits as it did, with the time it had
      const detail = (await client.req(`/v1/me/bookings/${made.json.code}`)).json
      expect(detail).toMatchObject({ status: 'pending', holdUntil: made.json.holdUntil })
      // everyone on the team hears it, a specialist too: who may answer requests may have changed
      const updated = (items: { type: string }[]) => items.some((e) => e.type === 'business.updated')
      expect((await eventsAfter(ayna, cursor, updated)).json.items.map((e: { type: string }) => e.type)).toContain('business.updated')
    } finally {
      await maysa.req(RULES, { method: 'PATCH', body: { confirmMode: 'manual', holdMinutes: 30, onlineEnabled: true } })
    }
  })
})

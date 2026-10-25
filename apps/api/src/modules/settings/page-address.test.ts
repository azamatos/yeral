/** The page address a business chooses (F-115, B-03, B-43; chapter 9, 25.10.2026). */
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { rateLimits } from '../../db/schema'
import { seed } from '../../db/seed'

const MAYSA = '+99365102030' // owner of Glow Studio
const AYNA = '+99365312210' // a specialist there

describe('the page address a business chooses (chapter 9, 25.10.2026)', () => {
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
  const check = async (b: ReturnType<typeof browser>, slug: string, business?: string) =>
    (await b.req(`/v1/page-address?${new URLSearchParams({ slug, ...(business && { business }) }).toString()}`)).json
  const start = (b: ReturnType<typeof browser>, slug?: string) =>
    b.req('/v1/setup', { body: { name: 'Aýna Beauty', categoryId: 'beauty', ...(slug && { slug }) } })

  it('checked as it is typed, written at the business step; a taken one is refused, a draft’s isn’t kept', async () => {
    const owner = await as('+99365940001', 'Aýna')
    expect(await check(owner, 'ayna-studio')).toEqual({ slug: 'ayna-studio', problem: null, suggestion: null })
    expect(await check(owner, 'ab')).toEqual({ slug: 'ab', problem: 'short', suggestion: null })
    expect((await check(owner, 'Glow Studio')).problem).toBe('chars')
    expect((await check(owner, 'yr-48213')).problem).toBe('reserved')
    // a reserved word and a taken address offer a free one like it
    expect(await check(owner, 'support')).toEqual({ slug: 'support', problem: 'reserved', suggestion: 'support-2' })
    expect(await check(owner, 'glow-studio')).toEqual({ slug: 'glow-studio', problem: 'taken', suggestion: 'glow-studio-2' })
    expect((await browser(t.app).req('/v1/page-address?slug=ayna-studio')).status).toBe(401)

    // the business step with the owner's own address
    expect((await start(owner, 'glow-studio')).json.error.details.issues).toEqual([{ path: ['slug'], code: 'taken' }])
    expect((await start(owner, 'admin')).status).toBe(400)
    expect((await start(owner, 'ayna-studio')).json).toEqual({ slug: 'ayna-studio' })
    // its own address is free to it, taken for anyone else; someone else's workspace isn't theirs to ask about
    expect((await check(owner, 'ayna-studio', 'ayna-studio')).problem).toBeNull()
    const other = await as('+99365940002', 'Other')
    expect((await check(other, 'ayna-studio')).problem).toBe('taken')
    expect((await other.req('/v1/page-address?slug=other-one&business=ayna-studio')).status).toBe(404)

    // a draft's address changes, the earlier one free again: nobody has seen it
    const moved = await owner.req('/v1/w/ayna-studio/settings/page-address', { method: 'PUT', body: { slug: 'ayna-salon' } })
    expect(moved.json).toEqual({ slug: 'ayna-salon' })
    expect((await owner.req('/v1/me/setup')).json.setup.slug).toBe('ayna-salon')
    expect((await check(other, 'ayna-studio')).problem).toBeNull()
    // the same address again changes nothing; a badly formed, short or reserved one is refused
    expect((await owner.req('/v1/w/ayna-salon/settings/page-address', { method: 'PUT', body: { slug: 'ayna-salon' } })).status).toBe(200)
    expect((await owner.req('/v1/w/ayna-salon/settings/page-address', { method: 'PUT', body: { slug: 'Ayna' } })).status).toBe(400)
    for (const slug of ['ay', 'support'])
      expect(
        (await owner.req('/v1/w/ayna-salon/settings/page-address', { method: 'PUT', body: { slug } })).json.error.details.issues,
      ).toEqual([{ path: ['slug'], code: 'invalid' }])
    // a booking code's start isn't an address at all (the contract's slug)
    expect((await owner.req('/v1/w/ayna-salon/settings/page-address', { method: 'PUT', body: { slug: 'yr-1' } })).status).toBe(400)
    // a booking code's start offers the address as a name would give it
    expect(await check(owner, 'yr-beauty')).toEqual({ slug: 'yr-beauty', problem: 'reserved', suggestion: 'yrbeauty' })
  })

  it('after the setup the old address opens the page and stays the business’s; taken back, it leaves the list', async () => {
    const maysa = await as(MAYSA)
    const moved = await maysa.req('/v1/w/glow-studio/settings/page-address', { method: 'PUT', body: { slug: 'glow' } })
    expect(moved.json).toEqual({ slug: 'glow' })
    // the old address opens the page as it is now, which names its address (the client site moves there); its
    // reviews and free times answer there too
    const anyone = browser(t.app)
    const page = await anyone.req('/v1/businesses/glow-studio?lang=en')
    expect(page.status).toBe(200)
    expect(page.json.slug).toBe('glow')
    expect((await anyone.req('/v1/businesses/glow-studio/reviews?lang=en')).status).toBe(200)
    // a page opened there keeps favourites as at the new address
    const client = await as('+99365940004', 'Client')
    expect((await client.req('/v1/me/favorites/glow-studio', { method: 'PUT' })).status).toBe(204)
    expect((await client.req('/v1/me/favorites?lang=en')).json.items.map((b: { slug: string }) => b.slug)).toEqual(['glow'])
    // the team works at the new address
    expect((await maysa.req('/v1/w/glow-studio/settings/profile')).status).toBe(404)
    expect((await maysa.req('/v1/w/glow/settings/profile')).json.slug).toBe('glow')
    expect((await maysa.req('/v1/me/workspaces')).json.items.map((w: { slug: string }) => w.slug)).toContain('glow')

    // nobody else takes the old address, written or made up
    const other = await as('+99365940003', 'Other')
    expect(await check(other, 'glow-studio')).toMatchObject({ problem: 'taken', suggestion: 'glow-studio-2' })
    expect((await start(other, 'glow-studio')).json.error.details.issues).toEqual([{ path: ['slug'], code: 'taken' }])
    const made = await other.req('/v1/setup', { body: { name: 'Glow Studio', categoryId: 'beauty' } })
    expect(made.json.slug).toBe('glow-studio-2')
    // nor the business's address, nor another business's old one
    expect(
      (await other.req('/v1/w/glow-studio-2/settings/page-address', { method: 'PUT', body: { slug: 'glow-studio' } })).json.error.details
        .issues,
    ).toEqual([{ path: ['slug'], code: 'taken' }])

    // back to the old address: it leaves the old ones, and the one it had joins them
    expect((await maysa.req('/v1/w/glow/settings/page-address', { method: 'PUT', body: { slug: 'glow-studio' } })).json).toEqual({
      slug: 'glow-studio',
    })
    expect((await anyone.req('/v1/businesses/glow?lang=en')).json.slug).toBe('glow-studio')
    expect((await check(other, 'glow')).problem).toBe('taken')
    // its own old address is free to it
    expect((await check(maysa, 'glow', 'glow-studio')).problem).toBeNull()

    // a specialist doesn't change it
    const ayna = await as(AYNA)
    expect((await ayna.req('/v1/w/glow-studio/settings/page-address', { method: 'PUT', body: { slug: 'ayna-glow' } })).status).toBe(403)

    // five moves a day (two made above): the sixth waits, and isn't kept
    let at = 'glow-studio'
    for (const slug of ['glow-a', 'glow-b', 'glow-c']) {
      expect((await maysa.req(`/v1/w/${at}/settings/page-address`, { method: 'PUT', body: { slug } })).status).toBe(200)
      at = slug
    }
    expect((await maysa.req('/v1/w/glow-c/settings/page-address', { method: 'PUT', body: { slug: 'glow-d' } })).status).toBe(429)
    expect((await check(other, 'glow-d')).problem).toBeNull()
  })
})

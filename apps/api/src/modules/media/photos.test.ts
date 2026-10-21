/** Photos (book F-084, F-101, B-12, B-37, Q-115): the gallery, a person's photo, a team member's, served by key. */
import { GALLERY_MAX, PHOTO_MAX_BYTES } from '@yeral/domain/photos'
import { and, eq, ne } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEMO_NOW, testApp } from '../../../test/app'
import { browser } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { businesses, rateLimits, staff } from '../../db/schema'
import { seed } from '../../db/seed'

const MAYSA = '+99365102030' // owner of Glow Studio
const SELBI = '+99365884102' // administrator
const MARAL = '+99361440819' // specialist: nails
const W = '/v1/w/glow-studio'

/** A tiny JPEG (a scan of one byte), one with a phone's EXIF before it, and a file that only says it's one. */
const tiny = (n: number) => [0xff, 0xd8, 0xff, 0xda, 0x00, 0x03, n, 0x12, 0xff, 0xd9]
const jpeg = (n = 0) => new File([new Uint8Array(tiny(n))], 'photo.jpg', { type: 'image/jpeg' })
const gps = [...'Exif']
  .map((c) => c.charCodeAt(0))
  .concat(
    [0, 0, 0x49, 0x49, 0x2a, 0, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [...'GPS 37.95N'].map((c) => c.charCodeAt(0)),
  )
const fromHome = (n: number) =>
  new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0, gps.length + 2, ...gps, ...tiny(n).slice(2)])], 'home.jpg', { type: 'image/jpeg' })
const svg = () => new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], 'photo.jpg', { type: 'image/jpeg' })

describe('photos (book F-101)', () => {
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
  /** A photo sent as a form, as the apps send it. */
  const upload = async (b: ReturnType<typeof browser>, method: 'PUT' | 'POST', path: string, file: File) => {
    const form = new FormData()
    form.set('file', file)
    const res = await t.app.request(path, { method, body: form, headers: { cookie: b.cookie } })
    // read as the test client reads every answer
    const json: any = await res.json()
    return { status: res.status, json }
  }
  const send = (b: ReturnType<typeof browser>, path: string, file: File) => upload(b, 'PUT', path, file)
  const post = (b: ReturnType<typeof browser>, path: string, file: File) => upload(b, 'POST', path, file)
  const keyOf = (url: string) => url.replace('http://media.test/', '')

  it('the gallery: added at the end, served by its key, ordered, taken away; checked by its bytes; 20 at most', async () => {
    const maysa = await as(MAYSA)
    const before = (await maysa.req(`${W}/settings/photos`)).json.items as { id: string; url: string }[]
    const added = await post(maysa, `${W}/settings/photos`, fromHome(1))
    expect(added.status).toBe(201)
    const mine = added.json.items.at(-1) as { id: string; url: string; alt: string }
    expect(mine).toMatchObject({ alt: 'Glow Studio' })
    expect(mine.url).toMatch(/^http:\/\/media\.test\/up\/b\/[\w-]+\/[\w-]+\.jpg$/)
    // served without where it was taken, kept by browsers
    const served = await t.app.request(`/media/${keyOf(mine.url)}`)
    expect(served.status).toBe(200)
    expect(served.headers.get('content-type')).toBe('image/jpeg')
    expect(served.headers.get('cache-control')).toContain('immutable')
    expect([...new Uint8Array(await served.arrayBuffer())]).toEqual(tiny(1))
    // its text is the business's name as it is now
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    await db.update(businesses).set({ name: 'Glow Beauty' }).where(eq(businesses.id, glow!.id))
    expect((await maysa.req(`${W}/settings/photos`)).json.items.at(-1).alt).toBe('Glow Beauty')
    await db.update(businesses).set({ name: glow!.name }).where(eq(businesses.id, glow!.id))
    expect((await t.app.request('/media/up/b/x/missing.jpg')).status).toBe(404)
    // the newest first: the cover on the page now
    const ids = [mine.id, ...before.map((p) => p.id)]
    expect((await maysa.req(`${W}/settings/photos/order`, { method: 'PUT', body: { ids } })).json.items[0].id).toBe(mine.id)
    expect((await browser(t.app).req('/v1/businesses/glow-studio?lang=en')).json.photos[0].url).toBe(mine.url)
    expect((await maysa.req(`${W}/settings/photos/order`, { method: 'PUT', body: { ids: [mine.id] } })).status).toBe(400)
    // only photos, and not too big
    expect((await post(maysa, `${W}/settings/photos`, svg())).json.error.details.issues).toEqual([{ path: ['file'], code: 'wrong_type' }])
    const huge = new File([new Uint8Array(PHOTO_MAX_BYTES + 1)], 'big.jpg', { type: 'image/jpeg' })
    expect((await post(maysa, `${W}/settings/photos`, huge)).status).toBe(400)
    // taken away: from the page and the store
    expect((await maysa.req(`${W}/settings/photos/${mine.id}`, { method: 'DELETE' })).json.items.map((p: { id: string }) => p.id)).toEqual(
      before.map((p) => p.id),
    )
    expect(t.storage.files.has(keyOf(mine.url))).toBe(false)
    // up to 20
    for (let i = before.length; i < GALLERY_MAX; i++) expect((await post(maysa, `${W}/settings/photos`, jpeg(i))).status).toBe(201)
    const full = await post(maysa, `${W}/settings/photos`, jpeg(99))
    expect(full.json.error.code).toBe('gallery_full')
    // the refused one isn't kept
    expect(t.storage.files.size).toBe(GALLERY_MAX - before.length)
    // the settings' people only
    expect((await post(await as(MARAL), `${W}/settings/photos`, jpeg())).status).toBe(403)
    await db
      .update(businesses)
      .set({ photos: glow!.photos.slice(0, before.length) })
      .where(eq(businesses.id, glow!.id))
  })

  it('a person’s photo, the same in every workspace; a new one replaces the old', async () => {
    const b = await as('+99365940001', 'Aýgül')
    const first = await send(b, '/v1/me/photo', jpeg(1))
    expect(first.status).toBe(200)
    expect(first.json.photo).toMatchObject({ alt: 'Aýgül' })
    expect(first.json.photo.url).toMatch(/^http:\/\/media\.test\/up\/u\/[\w-]+\/[\w-]+\.jpg$/)
    const second = await send(b, '/v1/me/photo', jpeg(2))
    expect(t.storage.files.has(keyOf(first.json.photo.url))).toBe(false)
    expect((await b.req('/v1/me')).json.photo.url).toBe(second.json.photo.url)
    const removed = await b.req('/v1/me/photo', { method: 'DELETE' })
    expect(removed.json.photo).toBeNull()
    expect(t.storage.files.has(keyOf(second.json.photo.url))).toBe(false)
  })

  it('uploads: signed in, so many an hour per account and per address, before the body is read', async () => {
    expect((await send(browser(t.app), '/v1/me/photo', jpeg())).status).toBe(401)
    // what a body holds doesn't matter before then: too big, or no form at all
    const huge = new File([new Uint8Array(PHOTO_MAX_BYTES + 1)], 'big.jpg', { type: 'image/jpeg' })
    expect((await send(browser(t.app), '/v1/me/photo', huge)).status).toBe(401)
    const raw = await t.app.request('/v1/me/photo', { method: 'PUT', body: 'not a form', headers: { 'content-type': 'text/plain' } })
    expect(raw.status).toBe(401)
    const b = await as('+99365940002', 'Jeren')
    const me = (await b.req('/v1/me')).json as { id: string }
    await db.insert(rateLimits).values({ key: `upload:user:${me.id}`, windowStart: new Date(DEMO_NOW), count: 60 })
    const refused = await send(b, '/v1/me/photo', huge)
    expect(refused.status).toBe(429)
    expect(refused.json.error.code).toBe('rate_limited')
    // the address's hour: another account from it is refused too
    await db.insert(rateLimits).values({ key: 'upload:ip:unknown', windowStart: new Date(DEMO_NOW), count: 120 })
    expect((await send(await as('+99365940004', 'Aýna'), '/v1/me/photo', jpeg())).status).toBe(429)
    expect(t.storage.files.size).toBe(0)
  })

  it('a deleted account takes its photo, and its draft’s gallery, from the store', async () => {
    const b = await as('+99365940003', 'Bahar')
    const photo = (await send(b, '/v1/me/photo', jpeg(1))).json.photo.url as string
    const { slug } = (await b.req('/v1/setup', { body: { name: 'Bahar Nails', categoryId: 'beauty' } })).json as { slug: string }
    const gallery = (await post(b, `/v1/w/${slug}/settings/photos`, jpeg(2))).json.items[0].url as string
    expect(t.storage.files.size).toBe(2)
    expect((await b.req('/v1/me', { method: 'DELETE' })).status).toBe(204)
    expect(t.storage.files.has(keyOf(photo))).toBe(false)
    expect(t.storage.files.has(keyOf(gallery))).toBe(false)
  })

  it('a team member’s picture, set by the owner, shown beside them', async () => {
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    const [maral] = await db
      .select()
      .from(staff)
      .where(and(eq(staff.businessId, glow!.id), eq(staff.name, 'Maral')))
    const maysa = await as(MAYSA)
    const set = await send(maysa, `${W}/team/${maral!.id}/photo`, jpeg(3))
    expect(set.status).toBe(200)
    expect(set.json).toMatchObject({ id: maral!.id, photo: { alt: 'Maral' } })
    const team = (await maysa.req(`${W}/team`)).json.items as { id: string; photo: { url: string } | null }[]
    expect(team.find((m) => m.id === maral!.id)!.photo!.url).toBe(set.json.photo.url)
    expect((await send(await as(SELBI), `${W}/team/${maral!.id}/photo`, jpeg(4))).status).toBe(403)
    // someone not on this team: refused before anything is kept
    const kept = t.storage.files.size
    const [other] = await db.select().from(staff).where(ne(staff.businessId, glow!.id)).limit(1)
    expect((await send(maysa, `${W}/team/${other!.id}/photo`, jpeg(5))).status).toBe(404)
    expect(t.storage.files.size).toBe(kept)
    // without the owner's picture the team sees Maral's own photo; clients don't
    const hers = (await send(await as(MARAL), '/v1/me/photo', jpeg(6))).json.photo.url as string
    const removed = await maysa.req(`${W}/team/${maral!.id}/photo`, { method: 'DELETE' })
    expect(removed.json.photo).toEqual({ url: hers, alt: 'Maral' })
    expect(t.storage.files.has(keyOf(set.json.photo.url))).toBe(false)
    const page = (await browser(t.app).req('/v1/businesses/glow-studio?lang=en')).json.specialists as { id: string; photo: unknown }[]
    expect(page.find((s) => s.id === maral!.id)!.photo).toBeNull()
    // once she's off the team, it sees only the owner's picture
    await db.update(staff).set({ status: 'removed' }).where(eq(staff.id, maral!.id))
    const after = (await maysa.req(`${W}/team`)).json.items as { id: string; photo: unknown }[]
    expect(after.find((m) => m.id === maral!.id)!.photo).toBeNull()
    await db.update(staff).set({ photo: maral!.photo, status: maral!.status }).where(eq(staff.id, maral!.id))
  })
})

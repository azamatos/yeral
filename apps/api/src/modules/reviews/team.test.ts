/** "Teswirler" (book B-53, B-54): the team's list, the reply, a report to Ýeral and its 48-hour recount. */
import { addDays, today } from '@yeral/domain/time'
import { and, eq } from 'drizzle-orm'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { signedInAdmin } from '../../../test/admin'
import { DEMO_NOW, site, testApp } from '../../../test/app'
import { browser, eventsAfter } from '../../../test/client'
import { testDatabase } from '../../../test/db'
import type { Db } from '../../db/client'
import { bookingItems, bookings, businesses, rateLimits, services, staff } from '../../db/schema'
import { seed } from '../../db/seed'
import { runDueJobs } from '../jobs/run'

const MAYSA = '+99365102030' // owner of Glow Studio
const SELBI = '+99365884102' // administrator
const MARAL = '+99361440819' // specialist: nails
const W = '/v1/w/glow-studio'
const TODAY = today(DEMO_NOW)

interface TeamReview {
  id: string
  rating: number
  reply: { text: string; by: string | null } | null
  report: { reason: string; by: string | null; state: string } | null
}

describe('the team’s reviews (book B-53, B-54)', () => {
  let db: Db
  let t: ReturnType<typeof testApp>
  let glowId: string
  let manicure: string
  let maralId: string
  let seq = 0

  /** A client's completed visit with Maral and the review they write for it. */
  async function reviewed(phone: string, rating: number, text: string) {
    const client = browser(t.app)
    const { me } = await client.login(phone, 'Reviewer')
    const code = `YR-80${String(++seq).padStart(4, '0')}`
    const date = addDays(TODAY, -seq)
    const [b] = await db
      .insert(bookings)
      .values({
        code,
        businessId: glowId,
        type: 'appointment',
        userId: me.id,
        clientName: 'Reviewer',
        clientPhone: phone,
        date,
        start: 600,
        end: 660,
        status: 'completed',
        completedAt: new Date(DEMO_NOW - seq * 86_400_000),
        source: 'web',
        priceType: 'fixed',
        priceAmount: 100,
      })
      .returning()
    await db.insert(bookingItems).values({
      bookingId: b!.id,
      serviceId: manicure,
      serviceName: { en: 'Manicure' },
      staffId: maralId,
      staffName: 'Maral',
      date,
      start: 600,
      end: 660,
      priceType: 'fixed',
      priceAmount: 100,
    })
    expect((await client.req(`/v1/me/bookings/${code}/review`, { body: { rating, text } })).status).toBe(200)
    return { client, code }
  }

  beforeAll(async () => {
    ;({ db } = await testDatabase())
    await seed(db, { demo: true, now: DEMO_NOW })
    const [glow] = await db.select().from(businesses).where(eq(businesses.slug, 'glow-studio'))
    glowId = glow!.id
    manicure = (await db.select().from(services).where(eq(services.businessId, glowId))).find((s) => s.name.en === 'Manicure')!.id
    maralId = (
      await db
        .select()
        .from(staff)
        .where(and(eq(staff.businessId, glowId), eq(staff.name, 'Maral')))
    )[0]!.id
  })
  beforeEach(async () => {
    await db.delete(rateLimits)
    t = testApp(db)
  })
  const as = async (phone: string) => {
    const b = browser(t.app)
    await b.login(phone)
    return b
  }
  const page = async (b: ReturnType<typeof browser>, query = '') =>
    (await b.req(`${W}/reviews?lang=en${query}`)).json as {
      items: TeamReview[]
      total: number
      summary: { rating: number | null; count: number; breakdown: Record<string, number>; unanswered: number } | null
    }
  const ratingOf = async () => {
    const [b] = await db.select().from(businesses).where(eq(businesses.id, glowId))
    return { count: b!.reviewsCount, breakdown: b!.ratingBreakdown as Record<string, number> }
  }

  it('the list: the summary, unanswered and by stars, sorted; a specialist reads her own visits’ without it', async () => {
    await reviewed('+99365920001', 2, 'Too long a wait')
    const maysa = await as(MAYSA)
    const all = await page(maysa)
    expect(all.summary).toMatchObject({ count: (await ratingOf()).count })
    expect(all.summary!.unanswered).toBeGreaterThan(0)
    const twos = await page(maysa, '&stars=2')
    expect(twos.items.every((r) => r.rating === 2)).toBe(true)
    expect(twos.items.length).toBeGreaterThan(0)
    const lowest = await page(maysa, '&sort=lowest&limit=3')
    expect(lowest.items.map((r) => r.rating)).toEqual([...lowest.items.map((r) => r.rating)].sort((a, b) => a - b))
    const maral = await page(await as(MARAL))
    expect(maral.summary).toBeNull()
    expect(maral.total).toBeLessThanOrEqual(all.total)
    expect(maral.items.length).toBeGreaterThan(0)
    expect((await (await as(MARAL)).req(`${W}/reviews?lang=en&staff=${glowId}`)).status).toBe(403)
  })

  it('the reply: published, changed and taken away by the owner and administrators; everyone sees it', async () => {
    const { code } = await reviewed('+99365920002', 5, 'Lovely')
    const maysa = await as(MAYSA)
    const id = (await page(maysa, '&unanswered=1')).items.find((r) => r.rating === 5)!.id
    expect((await maysa.req(`${W}/reviews/${id}/reply`, { method: 'PUT', body: { text: 'Thank you!' } })).status).toBe(204)
    expect((await page(maysa)).items.find((r) => r.id === id)!.reply).toMatchObject({ text: 'Thank you!', by: 'Maýsa' })
    const pub = (await browser(t.app).req('/v1/businesses/glow-studio/reviews?lang=en&limit=50')).json.items as {
      id: string
      reply: unknown
    }[]
    expect(pub.find((r) => r.id === id)!.reply).toMatchObject({ text: 'Thank you!' })
    const selbi = await as(SELBI)
    await selbi.req(`${W}/reviews/${id}/reply`, { method: 'PUT', body: { text: 'Thank you, see you soon!' } })
    expect((await page(maysa)).items.find((r) => r.id === id)!.reply).toMatchObject({ by: 'Selbi' })
    expect((await selbi.req(`${W}/reviews/${id}/reply`, { method: 'DELETE' })).status).toBe(204)
    expect((await page(maysa)).items.find((r) => r.id === id)!.reply).toBeNull()
    expect((await (await as(MARAL)).req(`${W}/reviews/${id}/reply`, { method: 'PUT', body: { text: 'x' } })).status).toBe(403)
    expect(code).toBeTruthy()
  })

  it('a report: out of the rating while Ýeral checks, once; an edit meanwhile counts later; 48 hours on it counts again', async () => {
    const { client, code } = await reviewed('+99365920003', 1, 'Fake, I was never there')
    const maysa = await as(MAYSA)
    const id = (await page(maysa)).items.find((r) => r.rating === 1 && !r.report)!.id
    const before = await ratingOf()
    expect((await maysa.req(`${W}/reviews/${id}/report`, { body: { reason: 'fake', text: 'No such booking' } })).status).toBe(204)
    expect(await ratingOf()).toMatchObject({ count: before.count - 1, breakdown: { ...before.breakdown, 1: before.breakdown['1']! - 1 } })
    expect((await page(maysa)).items.find((r) => r.id === id)!.report).toMatchObject({ reason: 'fake', by: 'Maýsa', state: 'checking' })
    const pub = (await browser(t.app).req('/v1/businesses/glow-studio/reviews?lang=en&limit=50')).json.items as {
      id: string
      underReview: boolean
    }[]
    expect(pub.find((r) => r.id === id)!.underReview).toBe(true)
    expect((await maysa.req(`${W}/reviews/${id}/report`, { body: { reason: 'spam' } })).json.error.code).toBe('already_reported')
    // the business may still reply; the client's new stars wait for the recount
    expect((await maysa.req(`${W}/reviews/${id}/reply`, { method: 'PUT', body: { text: 'We checked' } })).status).toBe(204)
    expect(
      (await client.req(`/v1/me/bookings/${code}/review`, { method: 'PATCH', body: { rating: 3, text: 'Changed my mind' } })).status,
    ).toBe(200)
    expect((await ratingOf()).count).toBe(before.count - 1)
    // 48 hours on, Ýeral hasn't decided: it counts again, with its stars now
    t.clock.now += 48 * 3_600_000 + 60_000
    await runDueJobs(t.deps)
    const after = await ratingOf()
    expect(after.count).toBe(before.count)
    expect(after.breakdown['3']).toBe(before.breakdown['3']! + 1)
    expect((await page(maysa)).items.find((r) => r.id === id)!.report).toMatchObject({ state: 'counted' })
    expect((await (await as(MARAL)).req(`${W}/reviews/${id}/report`, { body: { reason: 'fake' } })).status).toBe(403)
  })

  it('an account deleted while Ýeral checks its review doesn’t take it out of the rating twice', async () => {
    const { client } = await reviewed('+99365920004', 4, 'Good')
    const maysa = await as(MAYSA)
    const id = (await page(maysa)).items.find((r) => r.rating === 4 && !r.report && !r.reply)!.id
    const before = await ratingOf()
    await maysa.req(`${W}/reviews/${id}/report`, { body: { reason: 'other' } })
    expect((await client.req('/v1/me', { method: 'DELETE' })).status).toBe(204)
    expect((await ratingOf()).count).toBe(before.count - 1)
  })

  it('a reply taken away and undone is as it was; the specialist hears it, and the team hears the client’s edit', async () => {
    const { client, code } = await reviewed('+99365920005', 4, 'Nice')
    const maysa = await as(MAYSA)
    const selbi = await as(SELBI)
    const maral = await as(MARAL)
    const id = (await page(maysa)).items.find((r) => r.rating === 4 && !r.reply && !r.report)!.id
    const heard = (await maral.req('/v1/events')).json.cursor as string
    await maysa.req(`${W}/reviews/${id}/reply`, { method: 'PUT', body: { text: 'Thanks a lot' } })
    const told = await eventsAfter(maral, heard, (items) => items.some((e) => e.type === 'review.updated'))
    expect((told.json.items as { type: string }[]).map((e) => e.type)).toContain('review.updated')
    t.clock.now += 60_000
    await selbi.req(`${W}/reviews/${id}/reply`, { method: 'DELETE' })
    expect((await page(maysa)).items.find((r) => r.id === id)!.reply).toBeNull()
    expect((await page(maysa, '&unanswered=1')).items.map((r) => r.id)).toContain(id)
    await selbi.req(`${W}/reviews/${id}/reply`, { method: 'PUT', body: { text: 'Thanks a lot' } })
    expect((await page(maysa)).items.find((r) => r.id === id)!.reply).toMatchObject({ text: 'Thanks a lot', by: 'Maýsa' })
    const owners = (await maysa.req('/v1/events')).json.cursor as string
    await client.req(`/v1/me/bookings/${code}/review`, { method: 'PATCH', body: { rating: 3, text: 'Fine' } })
    const edited = await eventsAfter(maysa, owners, (items) => items.some((e) => e.type === 'review.updated'))
    expect((edited.json.items as { type: string }[]).map((e) => e.type)).toContain('review.updated')
    // the summary comes with the first page only; a page past the end still counts
    const later = (await maysa.req(`${W}/reviews?lang=en&limit=1&cursor=1`)).json
    expect(later.summary).toBeNull()
    const past = (await maysa.req(`${W}/reviews?lang=en&cursor=9000`)).json
    expect([past.items.length, past.total > 0]).toEqual([0, true])
  })

  it('Ýeral decides a report (Q-261, Q-262): kept, it counts and can’t be reported again; removed, it’s gone but to its author', async () => {
    const team = await signedInAdmin(t, 'moderator', 'Moderator')
    const maysa = await as(MAYSA)
    const kept = await reviewed('+99365920011', 2, 'Slow but fine')
    const gone = await reviewed('+99365920012', 1, 'Rude words here')
    const idOf = async (text: string) => (await page(maysa)).items.find((r) => (r as unknown as { text: string }).text === text)!.id
    const [keptId, goneId] = [await idOf('Slow but fine'), await idOf('Rude words here')]
    await maysa.req(`${W}/reviews/${keptId}/report`, { body: { reason: 'fake' } })
    await maysa.req(`${W}/reviews/${goneId}/report`, { body: { reason: 'insulting', text: 'Swearing' } })
    const before = await ratingOf()
    // the queue: the longest waiting first, who reported it and when it counts again
    const queue = (await team.req('/v1/admin/reviews?view=reported')).json.items as { id: string; report: Record<string, unknown> }[]
    expect(queue.map((r) => r.id)).toEqual(expect.arrayContaining([keptId, goneId]))
    expect(queue.find((r) => r.id === goneId)!.report).toMatchObject({
      reason: 'insulting',
      by: 'Maýsa',
      counted: false,
      countsAgainAt: t.clock.now + 48 * 3_600_000,
    })
    // kept: in the rating again, and never reported again
    expect((await team.req(`/v1/admin/reviews/${keptId}/clear`, { method: 'POST' })).status).toBe(204)
    expect((await ratingOf()).count).toBe(before.count + 1)
    expect((await page(maysa)).items.find((r) => r.id === keptId)!.report).toMatchObject({ state: 'cleared' })
    expect((await maysa.req(`${W}/reviews/${keptId}/report`, { body: { reason: 'spam' } })).json.error.code).toBe('already_reported')
    expect((await team.req(`/v1/admin/reviews/${keptId}/clear`, { method: 'POST' })).json.error.code).toBe('invalid_status')
    // removed: not on the page, not in the team's list, not in the rating (it wasn't counted), the author still sees it
    expect((await team.req(`/v1/admin/reviews/${goneId}/remove`, { body: { reason: 'Insults' } })).status).toBe(204)
    expect((await ratingOf()).count).toBe(before.count + 1)
    const pub = (await browser(t.app).req('/v1/businesses/glow-studio/reviews?lang=en&limit=50')).json.items as { id: string }[]
    expect(pub.map((r) => r.id)).not.toContain(goneId)
    expect((await page(maysa)).items.map((r) => r.id)).not.toContain(goneId)
    expect((await maysa.req(`${W}/reviews/${goneId}/reply`, { method: 'PUT', body: { text: 'x' } })).status).toBe(404)
    expect((await gone.client.req(`/v1/me/bookings/${gone.code}`)).json.review).toMatchObject({ rating: 1 })
    expect((await gone.client.req(`/v1/me/bookings/${gone.code}/review`, { body: { rating: 5, text: 'Again' } })).status).toBe(409)
    expect((await team.req('/v1/admin/reviews?view=removed')).json.items[0]).toMatchObject({ id: goneId, removed: { reason: 'Insults' } })
    expect((await team.req(`/v1/admin/reviews/${goneId}/remove`, { body: { reason: 'Again' } })).json.error.code).toBe('invalid_status')
    expect(kept.code).toBeTruthy()
  })

  it('a review removed after its 48 hours leaves the rating', async () => {
    const maysa = await as(MAYSA)
    await reviewed('+99365920013', 4, 'Late to decide')
    const id = (await page(maysa)).items.find((r) => (r as unknown as { text: string }).text === 'Late to decide')!.id
    await maysa.req(`${W}/reviews/${id}/report`, { body: { reason: 'other' } })
    t.clock.now += 48 * 3_600_000 + 60_000
    await runDueJobs(t.deps)
    const counted = await ratingOf()
    // a session lasts 12 hours: the team member signs in now
    const team = await signedInAdmin(t, 'late.moderator')
    expect((await team.req(`/v1/admin/reviews/${id}/remove`, { body: { reason: 'Not about this place' } })).status).toBe(204)
    expect(await ratingOf()).toMatchObject({
      count: counted.count - 1,
      breakdown: { ...counted.breakdown, 4: counted.breakdown['4']! - 1 },
    })
  })

  it('only the Ýeral team decides', async () => {
    expect((await (await as(MAYSA)).req('/v1/admin/reviews', { headers: { Origin: site.urls.cms } })).status).toBe(401)
  })

  it('removing a review never reported, or one kept, takes it out of the rating; an edit after it was kept may be reported again', async () => {
    const team = await signedInAdmin(t, 'remover')
    const maysa = await as(MAYSA)
    const a = await reviewed('+99365920021', 3, 'Never reported')
    const b = await reviewed('+99365920022', 2, 'Kept then edited')
    const idOf = async (text: string) => (await page(maysa)).items.find((r) => (r as unknown as { text: string }).text === text)!.id
    const [aId, bId] = [await idOf('Never reported'), await idOf('Kept then edited')]
    const before = await ratingOf()
    expect((await team.req(`/v1/admin/reviews/${aId}/remove`, { body: { reason: 'Spam' } })).status).toBe(204)
    expect((await ratingOf()).count).toBe(before.count - 1)
    // the author's edit of a removed review moves nothing
    await a.client.req(`/v1/me/bookings/${a.code}/review`, { method: 'PATCH', body: { rating: 5, text: 'Edited' } })
    expect((await ratingOf()).count).toBe(before.count - 1)
    // kept, then edited: reportable again, still counted
    await maysa.req(`${W}/reviews/${bId}/report`, { body: { reason: 'fake' } })
    await team.req(`/v1/admin/reviews/${bId}/clear`, { method: 'POST' })
    await b.client.req(`/v1/me/bookings/${b.code}/review`, { method: 'PATCH', body: { rating: 1, text: 'Now insulting' } })
    expect((await page(maysa)).items.find((r) => r.id === bId)!.report).toBeNull()
    expect((await maysa.req(`${W}/reviews/${bId}/report`, { body: { reason: 'insulting' } })).status).toBe(204)
    // removed once kept: out of the rating
    await team.req(`/v1/admin/reviews/${bId}/clear`, { method: 'POST' })
    const kept = await ratingOf()
    expect((await team.req(`/v1/admin/reviews/${bId}/remove`, { body: { reason: 'Insults' } })).status).toBe(204)
    expect((await ratingOf()).count).toBe(kept.count - 1)
  })
})

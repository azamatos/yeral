/**
 * Search and Home (client spec §4.1–4.2, §5): verified businesses in the map area, near the position (radius), or in the
 * chosen city — the market's main one when there is none (book Q-107); filtered by category, type, rating, price, open
 * now and "has free time" on the chosen day(s); nearest first, or by rating × reviews without a position.
 */
import type { SearchQuery } from '@yeral/contract/catalog'
import { boundingBox, distanceM, popularity } from '@yeral/domain/geo'
import { today } from '@yeral/domain/time'
import { and, between, eq, gte, ilike, or, sql, type SQL } from 'drizzle-orm'
import { anyTextLike } from '../../db/localized'
import { businesses, categories, services } from '../../db/schema'
import type { Deps } from '../../deps'
import { buildCards } from './cards'
import { cityOrMain } from './cities'

const escapeLike = (q: string) => q.replace(/[\\%_]/g, (ch) => `\\${ch}`)

/** Anywhere in the text (search). */
export const likeOf = (q: string) => `%${escapeLike(q)}%`

/** At the start of a word (suggestions): `ma` finds "Manikýur", not "massažy" inside "Arka massažy". */
export const wordStartLikes = (q: string) => [`${escapeLike(q)}%`, `% ${escapeLike(q)}%`] as const

export async function search(deps: Deps, q: SearchQuery) {
  const { db } = deps
  const date = q.date ?? today(deps.now())
  const position = q.lat !== undefined && q.lng !== undefined ? { lat: q.lat, lng: q.lng } : null

  // the map area wins, then the position (near me, or around a picked place); a city only without either
  const radius = !q.bbox && position
  const city = q.bbox || position ? null : await cityOrMain(db, q.city)

  const where: SQL[] = [eq(businesses.verification, 'verified')]
  if (city) where.push(eq(businesses.cityId, city))
  if (q.cat) where.push(eq(businesses.categoryId, q.cat))
  if (q.type) where.push(sql`${q.type} = any(${businesses.bookingTypes})`)
  if (q.womenOnly) where.push(eq(businesses.womenOnly, true))
  if (q.minRating !== undefined) where.push(gte(businesses.rating, q.minRating))
  if (q.bbox) {
    const [minLat, minLng, maxLat, maxLng] = q.bbox
    where.push(between(businesses.lat, minLat, maxLat), between(businesses.lng, minLng, maxLng))
  } else if (radius) {
    const box = boundingBox(position, q.r)
    where.push(between(businesses.lat, box.minLat, box.maxLat), between(businesses.lng, box.minLng, box.maxLng))
  }
  if (q.q) {
    const like = likeOf(q.q)
    where.push(
      or(
        ilike(businesses.name, like),
        anyTextLike(businesses.kind, like),
        sql`exists (select 1 from ${categories} where ${categories.id} = ${businesses.categoryId} and ${anyTextLike(categories.name, like)})`,
        sql`exists (select 1 from ${services} where ${services.businessId} = ${businesses.id} and not ${services.archived} and ${anyTextLike(services.name, like)})`,
      ) as SQL,
    )
  }

  let rows = await db
    .select({
      id: businesses.id,
      lat: businesses.lat,
      lng: businesses.lng,
      rating: businesses.rating,
      reviewsCount: businesses.reviewsCount,
    })
    .from(businesses)
    .where(and(...where))
  if (radius) rows = rows.filter((r) => distanceM(position, r) <= q.r * 1000)

  const cards = (
    await buildCards(
      deps,
      rows.map((r) => r.id),
      { lang: q.lang, date, days: q.week ? 7 : 1, partySize: q.party, position, q: q.q },
    )
  )
    .filter((x) => x.hasFree)
    .map((x) => x.card)
    .filter((c) => !q.openNow || c.open.open)
    .filter((c) => q.maxPrice === undefined || !c.priceFrom || c.priceFrom.amount <= q.maxPrice)

  const byPopularity = (a: (typeof cards)[number], b: (typeof cards)[number]) =>
    popularity(b.rating ?? 0, b.reviewsCount) - popularity(a.rating ?? 0, a.reviewsCount)
  cards.sort((a, b) => {
    if (q.sort === 'rating') return (b.rating ?? 0) - (a.rating ?? 0) || b.reviewsCount - a.reviewsCount
    if (q.sort === 'price') {
      // places without a price (tables, hidden prices only) go last
      const x = a.priceFrom?.amount ?? Infinity
      const y = b.priceFrom?.amount ?? Infinity
      return x === y ? byPopularity(a, b) : x < y ? -1 : 1
    }
    return position ? (a.distanceM ?? 0) - (b.distanceM ?? 0) : byPopularity(a, b)
  })

  const offset = Number(q.cursor ?? 0) || 0
  const items = cards.slice(offset, offset + q.limit)
  return {
    items,
    total: cards.length,
    cursor: offset + q.limit < cards.length ? String(offset + q.limit) : null,
    located: !!position,
    city,
  }
}

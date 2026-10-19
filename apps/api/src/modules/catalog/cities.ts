/** The market's cities (book Q-107): the "Nirede?" list, and the city beside an address. */
import { MARKET } from '@yeral/domain/market'
import type { Locale } from '@yeral/domain/model'
import { asc, eq } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { cities } from '../../db/schema'
import { text } from './map'

export type CityRow = typeof cities.$inferSelect

/** Every city in menu order: a short list, read whole. */
export const loadCities = (db: Queryable): Promise<CityRow[]> => db.select().from(cities).orderBy(asc(cities.sort))

/** A business's city as the client gets it, named in the reader's language. */
export const cityRefOf = (rows: readonly CityRow[], id: string, lang: Locale) => ({
  id,
  name: text(rows.find((c) => c.id === id)?.name, lang),
})

/** One business's city (a booking's address), named in the reader's language. */
export async function cityRef(db: Queryable, id: string, lang: Locale) {
  const [row] = await db.select().from(cities).where(eq(cities.id, id))
  return { id, name: text(row?.name, lang) }
}

/** The city a request names, or the market's main one when it names none or one that doesn't exist (a stale link). */
export async function cityOrMain(db: Queryable, id: string | undefined): Promise<string> {
  if (!id || id === MARKET.mainCity) return MARKET.mainCity
  const [row] = await db.select({ id: cities.id }).from(cities).where(eq(cities.id, id))
  return row?.id ?? MARKET.mainCity
}

/** The market's cities (book Q-107): the "Nirede?" list, and the city beside an address. */
import type { Locale } from '@yeral/domain/model'
import { asc } from 'drizzle-orm'
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

/**
 * SQL over `Localized` jsonb columns ({ en?, tk?, ru? }), matching `localized()` in `@yeral/domain/model`: a business
 * writes any one language (book Q-102), so a text may exist in another language than the one asked.
 */
import { MARKET } from '@yeral/domain/market'
import type { Locale } from '@yeral/domain/model'
import { sql, type AnyColumn, type SQL } from 'drizzle-orm'

/** The text in `lang`, else in the market's main language, else in whichever language it was written. */
export function textIn(col: AnyColumn | SQL, lang: Locale): SQL<string> {
  return sql<string>`coalesce(nullif(${col}->>${lang}, ''), nullif(${col}->>${MARKET.defaultLanguage}, ''), (select t.v from jsonb_each_text(${col}) as t(k, v) where t.v <> '' limit 1), '')`
}

/** Whether the text matches any of the ILIKE patterns in any language: people type in whichever language they think in. */
export function anyTextLike(col: AnyColumn | SQL, ...patterns: string[]): SQL {
  const likes = sql.join(
    patterns.map((p) => sql`t.v ilike ${p}`),
    sql` or `,
  )
  return sql`exists (select 1 from jsonb_each_text(${col}) as t(k, v) where ${likes})`
}

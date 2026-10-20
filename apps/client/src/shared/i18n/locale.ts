/**
 * The language `/` opens in (book Q-132): the person's own choice when the site has it, else the first language the
 * phone or browser asks for that the site has, else the market's main language.
 */
import { DEFAULT_LOCALE, type Locale } from '@yeral/i18n'
import { SITE_LOCALES } from './messages'

/** `Accept-Language` as an ordered list of primary subtags, most wanted first: «ru-RU,ru;q=0.9,en;q=0.8» → ru, ru, en. */
export function acceptedLanguages(header: string | null | undefined): string[] {
  if (!header) return []
  return header
    .split(',')
    .map((part, index) => {
      const [tag = '', ...params] = part.trim().split(';')
      const q = params.map((p) => /^\s*q=([\d.]+)\s*$/i.exec(p)?.[1]).find((v) => v !== undefined)
      return { tag: tag.trim().toLowerCase().split('-')[0] ?? '', q: q === undefined ? 1 : Number(q), index }
    })
    .filter((l) => l.tag && l.tag !== '*' && l.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .map((l) => l.tag)
}

export function pickLocale({
  saved,
  accepted,
  locales = SITE_LOCALES,
}: {
  /** The signed-in person's language (their profile), when there is one. */
  saved?: string | null
  accepted: readonly string[]
  /** The site's languages (a test passes a market's several). */
  locales?: readonly Locale[]
}): Locale {
  const offered = (l: string | null | undefined): l is Locale => !!l && (locales as readonly string[]).includes(l)
  if (offered(saved)) return saved
  return accepted.find(offered) ?? DEFAULT_LOCALE
}

import { MARKET } from '@yeral/domain/market'
import type { Locale, Localized } from '@yeral/domain/model'

/**
 * A name or text as the business writes it over: the reader's language, with the market's other languages it wrote
 * kept. A starter service or group keeps every language it came with (tk, ru, en), and the api takes only the
 * market's, so the rest stay out. Settings → Services and the wizard's services step write names through it.
 */
export function writtenIn(before: Localized | null | undefined, locale: Locale, text: string): Localized {
  const kept = Object.fromEntries(
    Object.entries(before ?? {}).filter(([l, v]) => l !== locale && v && (MARKET.languages as readonly string[]).includes(l)),
  )
  return { ...kept, [locale]: text.trim() }
}

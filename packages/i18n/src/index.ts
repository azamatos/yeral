// Public API of @yeral/i18n: locales, shared messages, formatters (ADR 0008, ADR 0022).
// Non-React callers (the api) import `@yeral/i18n/fmt` and `@yeral/i18n/messages`: this entry loads use-intl's React part.
import { useLocale } from 'use-intl'
import { createFmt, type Fmt } from './fmt'
import { DEFAULT_LOCALE, isLocale, type Locale } from './messages'

export { createFmt, formatNumber, type Fmt } from './fmt'
export { DEFAULT_LOCALE, isLocale, LOCALES, MARKET_LOCALES, messages, type Locale, type SharedMessages } from './messages'
export { setTextStretch, stretched } from './stretch'

/** Every business is in the market's zone; dates are formatted in it, never in the browser's. */
export { ZONE as TIME_ZONE } from '@yeral/domain/time'

// formatters are pure per locale: one each, shared by every component and render
const fmts = new Map<Locale, Fmt>()

/** Formatters for the current locale (inside use-intl's `IntlProvider`). */
export function useFmt(): Fmt {
  const raw = useLocale()
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE
  let fmt = fmts.get(locale)
  if (!fmt) fmts.set(locale, (fmt = createFmt(locale)))
  return fmt
}

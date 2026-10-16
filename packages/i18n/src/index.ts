// Public API of @yeral/i18n: locales, shared messages, formatters (ADR 0008, ADR 0016).
// Non-React callers (the api) import `@yeral/i18n/fmt` and `@yeral/i18n/messages`: this entry loads use-intl's React part.
import { useLocale } from 'use-intl'
import { createFmt, type Fmt } from './fmt'
import { DEFAULT_LOCALE, isLocale, type Locale } from './messages'

export { createFmt, formatNumber, type Fmt } from './fmt'
export { DEFAULT_LOCALE, isLocale, LOCALES, messages, type Locale, type SharedMessages } from './messages'

/** Every business is in Ashgabat today; dates are formatted in the business's zone, never the browser's. */
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

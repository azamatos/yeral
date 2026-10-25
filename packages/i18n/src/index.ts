// Public API of @yeral/i18n: locales, shared messages, formatters (ADR 0008, ADR 0022).
// Non-React callers (the api) import `@yeral/i18n/fmt` and `@yeral/i18n/messages`: this entry loads use-intl's React part.
import { useLocale } from 'use-intl'
import { createFmt, type Fmt } from './fmt'
import { DEFAULT_LOCALE, isLocale } from './messages'
import { textStretch } from './stretch'

export { createFmt, formatNumber, type Fmt } from './fmt'
export { DEFAULT_LOCALE, isLocale, LOCALES, MARKET_LOCALES, messages, type Locale, type SharedMessages } from './messages'
export { appMessages, setTextStretch, stretched, textStretch } from './stretch'

/** Every business is in the market's zone; dates are formatted in it, never in the browser's. */
export { ZONE as TIME_ZONE } from '@yeral/domain/time'

// formatters are pure per locale (and Storybook's text length): one each, shared by every component and render
const fmts = new Map<string, Fmt>()

/** Formatters for the current locale (inside use-intl's `IntlProvider`). */
export function useFmt(): Fmt {
  const raw = useLocale()
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE
  const key = `${locale}:${textStretch()}`
  let fmt = fmts.get(key)
  if (!fmt) fmts.set(key, (fmt = createFmt(locale)))
  return fmt
}

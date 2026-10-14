// Public API of @yeral/i18n: locales, shared messages, formatters (ADR 0008, ADR 0016).
import { useLocale } from 'use-intl'
import { createFmt, type Fmt } from './fmt'
import { isLocale, type Locale } from './messages'

export { createFmt, formatNumber, type Fmt } from './fmt'
export { DEFAULT_LOCALE, isLocale, LOCALES, messages, type Locale, type SharedMessages } from './messages'

/** Every business is in Ashgabat today; dates are formatted in the business's zone, never the browser's. */
export const TIME_ZONE = 'Asia/Ashgabat'

/** Formatters for the current locale (inside use-intl's `IntlProvider`). */
export function useFmt(): Fmt {
  const locale = useLocale()
  return createFmt(isLocale(locale) ? locale : ('tk' satisfies Locale))
}

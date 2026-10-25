/**
 * The app's words (skill `i18n`, ADR 0022): the shared namespaces of `@yeral/i18n` (`common`, `status`, `errors`,
 * `fmt` …) plus the app's own from `messages/<locale>.json`. English is the source of the keys; each market's other
 * languages are added before that market launches (Turkmenistan: Turkmen, Russian).
 */
import { DEFAULT_LOCALE, isLocale, MARKET_LOCALES, messages as shared, stretched, type Locale, type SharedMessages } from '@yeral/i18n'
import en from '../../../messages/en.json'

export type BusinessMessages = typeof en
export type Messages = SharedMessages & BusinessMessages

/** The app's namespaces per language. The first launch offers English only (`MARKET_LOCALES`). */
export const BUSINESS_MESSAGES: Partial<Record<Locale, BusinessMessages>> = { en }

/**
 * The language the app speaks: the person's own when this market offers it (the business app takes it from the
 * account, not the address: systemPatterns "i18n"), else the market's main language.
 */
export function appLocale(wanted?: string | null): Locale {
  return wanted && isLocale(wanted) && MARKET_LOCALES.includes(wanted) && BUSINESS_MESSAGES[wanted] ? wanted : DEFAULT_LOCALE
}

const merged = new Map<Locale, Messages>()

/** The words for a language (longer by Storybook's «Text: +30 %» when it's on, `stretched`). */
export function messagesFor(locale: Locale): Messages {
  let words = merged.get(locale)
  if (!words) merged.set(locale, (words = { ...shared[locale], ...(BUSINESS_MESSAGES[locale] ?? en) }))
  return stretched(words)
}

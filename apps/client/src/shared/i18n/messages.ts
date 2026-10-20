/**
 * The site's words (skill `i18n`, ADR 0022): the shared namespaces of `@yeral/i18n` (`common`, `status`, `errors`,
 * `fmt` …) plus the site's own from `messages/<locale>.json`. English is the source of the keys; each market's other
 * languages are added before that market launches (Turkmenistan: Turkmen, Russian).
 */
import { DEFAULT_LOCALE, isLocale, MARKET_LOCALES, messages as shared, type Locale, type SharedMessages } from '@yeral/i18n'
import { createTranslator } from 'use-intl/core'
import en from '../../../messages/en.json'

export type ClientMessages = typeof en
export type Messages = SharedMessages & ClientMessages

/** The site's namespaces per language. The first launch offers English only (`MARKET_LOCALES`). */
export const CLIENT_MESSAGES: Partial<Record<Locale, ClientMessages>> = { en }

/** The languages the site's addresses start with (`/en/…`): the market's, in menu order, each with its words. */
export const SITE_LOCALES: readonly Locale[] = MARKET_LOCALES.filter((l) => CLIENT_MESSAGES[l])

export const isSiteLocale = (value: string | undefined): value is Locale =>
  value !== undefined && isLocale(value) && SITE_LOCALES.includes(value)

/** The language of an address's first segment, or the market's main language when it isn't one of the site's. */
export const siteLocale = (value: string | undefined): Locale => (isSiteLocale(value) ? value : DEFAULT_LOCALE)

export function messagesFor(locale: Locale): Messages {
  return { ...shared[locale], ...(CLIENT_MESSAGES[locale] ?? en) }
}

/** The words outside React: a route's `head()` (title, description) is written before any component renders. */
export function translatorFor(locale: Locale) {
  return createTranslator({ locale, messages: messagesFor(locale) })
}

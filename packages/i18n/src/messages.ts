import { MARKET } from '@yeral/domain/market'
import { LOCALES, type Locale } from '@yeral/domain/model'
import en from './messages/en.json'
import ru from './messages/ru.json'
import tk from './messages/tk.json'

export { LOCALES, type Locale } from '@yeral/domain/model'

/** Shared namespaces every app merges with its own: `common`, `status`, `fmt`. English is the source of the keys (ADR 0022). */
export type SharedMessages = typeof en

export const messages: Record<Locale, SharedMessages> = { en, tk, ru }

/** The languages this deployment's sites offer (its market's), in menu order. */
export const MARKET_LOCALES = MARKET.languages
/** For a new visitor, and for SMS to people who never chose a language (book Q-292). */
export const DEFAULT_LOCALE: Locale = MARKET.defaultLanguage

export const isLocale = (s: string): s is Locale => (LOCALES as readonly string[]).includes(s)

import { LOCALES, type Locale } from '@yeral/domain/model'
import en from './messages/en.json'
import ru from './messages/ru.json'
import tk from './messages/tk.json'

export { DEFAULT_LOCALE, LOCALES, type Locale } from '@yeral/domain/model'

/** Shared namespaces every app merges with its own: `common`, `status`, `fmt`. Turkmen is the source of the keys. */
export type SharedMessages = typeof tk

export const messages: Record<Locale, SharedMessages> = { tk, ru, en }

export const isLocale = (s: string): s is Locale => (LOCALES as readonly string[]).includes(s)

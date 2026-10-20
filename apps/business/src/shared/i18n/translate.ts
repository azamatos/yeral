import { TIME_ZONE } from '@yeral/i18n'
import { createTranslator } from 'use-intl'
import { appLocale, messagesFor } from './messages'

/**
 * The app's words outside a component (a route that redirects with a toast), in the language the screens speak: the
 * one `I18nProvider` set on the page (`<html lang>`), so the two never drift.
 */
export function translator() {
  const locale = appLocale(document.documentElement.lang)
  return createTranslator({ locale, messages: messagesFor(locale), timeZone: TIME_ZONE })
}

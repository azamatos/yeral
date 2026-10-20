import { TIME_ZONE } from '@yeral/i18n'
import { createTranslator } from 'use-intl'
import { appLocale, messagesFor } from './messages'

/**
 * The app's words outside a component (a route that redirects with a toast): the same messages and language as the
 * screens (`appLocale()`, the market's main until the person's own is used).
 */
export function translator() {
  const locale = appLocale()
  return createTranslator({ locale, messages: messagesFor(locale), timeZone: TIME_ZONE })
}

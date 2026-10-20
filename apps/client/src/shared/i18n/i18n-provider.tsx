import { TIME_ZONE, type Locale } from '@yeral/i18n'
import type { ReactNode } from 'react'
import { IntlProvider } from 'use-intl'
import { messagesFor } from './messages'

/**
 * use-intl for the whole site in the address's language, in the market's time zone (dates are never the browser's).
 * The page's `<html lang>` is written by the document itself, on the server too.
 */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <IntlProvider locale={locale} messages={messagesFor(locale)} timeZone={TIME_ZONE}>
      {children}
    </IntlProvider>
  )
}

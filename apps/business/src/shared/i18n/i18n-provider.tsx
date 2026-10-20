import { TIME_ZONE, type Locale } from '@yeral/i18n'
import { useEffect, useMemo, type ReactNode } from 'react'
import { IntlProvider } from 'use-intl'
import { messagesFor } from './messages'

/** use-intl for the whole app, in the market's time zone (dates are never the browser's). */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const messages = useMemo(() => messagesFor(locale), [locale])
  // screen readers and hyphenation follow the language on screen
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])
  return (
    <IntlProvider locale={locale} messages={messages} timeZone={TIME_ZONE}>
      {children}
    </IntlProvider>
  )
}

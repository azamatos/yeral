import { TIME_ZONE } from '@yeral/i18n'
import type { ReactNode } from 'react'
import { IntlProvider } from 'use-intl'
import { messages } from './messages'

/** use-intl for the whole app, in the market's time zone (dates are never the browser's). */
export function I18nProvider({ children }: { children: ReactNode }) {
  return (
    <IntlProvider locale="en" messages={messages()} timeZone={TIME_ZONE}>
      {children}
    </IntlProvider>
  )
}

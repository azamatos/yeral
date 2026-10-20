// Typed keys for `useTranslations` across the app: a key missing from the English source fails type-checking.
import type { Locale } from '@yeral/i18n'
import type { Messages } from './messages'

declare module 'use-intl' {
  interface AppConfig {
    Locale: Locale
    Messages: Messages
  }
}

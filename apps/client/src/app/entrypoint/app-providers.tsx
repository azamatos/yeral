import type { Locale } from '@yeral/i18n'
import type { Sdk } from '@yeral/sdk'
import { SdkProvider } from '@yeral/sdk/react'
import { UIProvider } from '@yeral/ui/provider'
import { Toaster } from '@yeral/ui/toast'
import type { ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { I18nProvider } from '@/shared/i18n'

/**
 * Everything a page expects above it but the query cache (the router's SSR integration provides that one): the sdk,
 * the words in the address's language, the design system.
 */
export function AppProviders({ sdk, locale, children }: { sdk: Sdk; locale: Locale; children: ReactNode }) {
  return (
    <SdkProvider sdk={sdk}>
      <I18nProvider locale={locale}>
        <UIProvider>
          {children}
          <AppToaster />
        </UIProvider>
      </I18nProvider>
    </SdkProvider>
  )
}

function AppToaster() {
  const t = useTranslations('site')
  return <Toaster label={t('notifications')} />
}

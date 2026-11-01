import { QueryClientProvider } from '@tanstack/react-query'
import { UIProvider } from '@yeral/ui/provider'
import { Toaster } from '@yeral/ui/toast'
import type { ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { SdkProvider, type Api } from '@/shared/api'
import { I18nProvider } from '@/shared/i18n'

/** Everything a screen expects above it: server state, the sdk, the words, the design system. */
export function AppProviders({ api, children }: { api: Api; children: ReactNode }) {
  return (
    <QueryClientProvider client={api.queryClient}>
      <SdkProvider sdk={api.sdk}>
        <I18nProvider>
          <UIProvider>
            {children}
            <AppToaster />
          </UIProvider>
        </I18nProvider>
      </SdkProvider>
    </QueryClientProvider>
  )
}

function AppToaster() {
  const t = useTranslations('app')
  return <Toaster label={t('notifications')} />
}

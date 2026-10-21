import { QueryClientProvider } from '@tanstack/react-query'
import {
  createMemoryHistory,
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
  type RouteComponent,
} from '@tanstack/react-router'
import { DEFAULT_LOCALE } from '@yeral/i18n'
import { createApi, type Api } from '@yeral/sdk'
import { SdkProvider } from '@yeral/sdk/react'
import { UIProvider } from '@yeral/ui/provider'
import { Toaster } from '@yeral/ui/toast'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { I18nProvider } from '@/shared/i18n'
import { offline } from './fake-api'

/**
 * A page of the site in a story, as the site runs it in the browser: the query cache, the sdk, the words and a router
 * (in memory) with the given routes (`/$lang`, `/$lang/account/profile` …), starting at `path`. `server` makes a
 * `fetch` that answers like the api, a fresh one on every mount, so the sdk, its errors and its cache run for real
 * (ADR 0013: contract-shaped fakes, never a real api).
 */
export function PageStory({
  routes,
  path = `/${DEFAULT_LOCALE}`,
  server = offline,
}: {
  routes: Record<string, RouteComponent>
  path?: string
  server?: () => typeof fetch
}) {
  const [{ api, router }] = useState(() => {
    const api = createApi({ baseUrl: 'http://api.test', fetch: server() })
    // a story fails at once instead of retrying
    api.queryClient.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } })
    const root = createRootRouteWithContext<Api>()({ component: Outlet })
    const pages = Object.entries(routes).map(([path, component]) => createRoute({ getParentRoute: () => root, path, component }))
    const router = createRouter({
      routeTree: root.addChildren(pages),
      history: createMemoryHistory({ initialEntries: [path] }),
      context: api,
    })
    return { api, router }
  })
  return (
    <QueryClientProvider client={api.queryClient}>
      <SdkProvider sdk={api.sdk}>
        <I18nProvider locale={DEFAULT_LOCALE}>
          <UIProvider>
            <RouterProvider router={router} />
            <StoryToaster />
          </UIProvider>
        </I18nProvider>
      </SdkProvider>
    </QueryClientProvider>
  )
}

function StoryToaster() {
  const t = useTranslations('site')
  return <Toaster label={t('notifications')} />
}

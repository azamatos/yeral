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
import { UIProvider } from '@yeral/ui/provider'
import { Toaster } from '@yeral/ui/toast'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { createApi, SdkProvider, type Api } from '@/shared/api'
import { appLocale, I18nProvider } from '@/shared/i18n'

/** No api in the story: every request fails like a lost connection. */
const offline = (): typeof fetch => () => Promise.reject(new TypeError('no api in this story'))

/**
 * A screen of the app in a story, as the app runs it: the query cache, the sdk, the words and a router (in memory)
 * with the given routes, starting at `path`. `server` makes a `fetch` that answers like the api, a fresh one on every
 * mount, so the sdk, its errors and its cache run for real (ADR 0013: contract-shaped mocks, never a real api).
 */
export function PageStory({
  routes,
  layouts = {},
  path = '/',
  server = offline,
}: {
  routes: Record<string, RouteComponent>
  /** Layout routes with pages inside (`'/w/$slug': { component: WorkspaceShell, children: { calendar: … } }`). */
  layouts?: Record<string, { component: RouteComponent; children: Record<string, RouteComponent> }>
  path?: string
  server?: () => typeof fetch
}) {
  const [{ api, router }] = useState(() => {
    const api = createApi({ baseUrl: 'http://api.test', fetch: server() })
    // a story fails at once instead of retrying
    api.queryClient.setDefaultOptions({ queries: { retry: false }, mutations: { retry: false } })
    const root = createRootRouteWithContext<Api>()({ component: Outlet })
    const nested = Object.entries(layouts).map(([path, { component, children }]) => {
      const layout = createRoute({ getParentRoute: () => root, path, component })
      return layout.addChildren(
        Object.entries(children).map(([path, component]) => createRoute({ getParentRoute: () => layout, path, component })),
      )
    })
    const pages = [
      ...Object.entries(routes).map(([path, component]) => createRoute({ getParentRoute: () => root, path, component })),
      ...nested,
    ]
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
        <I18nProvider locale={appLocale()}>
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
  const t = useTranslations('app')
  return <Toaster label={t('notifications')} />
}

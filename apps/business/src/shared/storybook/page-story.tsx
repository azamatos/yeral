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
import { useState } from 'react'
import { createApi, SdkProvider, type Api } from '@/shared/api'
import { appLocale, I18nProvider } from '@/shared/i18n'

/** A request no story expects: it fails like a lost connection. */
const offline: typeof fetch = () => Promise.reject(new TypeError('no api in this story'))

/**
 * A screen of the app in a story, as the app runs it: the query cache, the sdk, the words and a router (in memory)
 * with the given routes, starting at `path`. `fetch` answers like the api, so the sdk, its errors and its cache run
 * for real (ADR 0013: contract-shaped mocks, never a real api).
 */
export function PageStory({
  routes,
  path = '/',
  fetch = offline,
}: {
  routes: Record<string, RouteComponent>
  path?: string
  fetch?: typeof globalThis.fetch
}) {
  const [{ api, router }] = useState(() => {
    const api = createApi({ baseUrl: 'http://api.test', fetch })
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
        <I18nProvider locale={appLocale()}>
          <UIProvider>
            <RouterProvider router={router} />
          </UIProvider>
        </I18nProvider>
      </SdkProvider>
    </QueryClientProvider>
  )
}

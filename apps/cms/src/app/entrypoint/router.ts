import { createRouter } from '@tanstack/react-router'
import type { Api } from '@/shared/api'
import { routeTree } from '../routeTree.gen'

/** File routes from `routes/` (thin: a page and its search schema), with the query cache and the sdk as context. */
export function createAppRouter(api: Api) {
  return createRouter({
    routeTree,
    context: api,
    defaultPreload: 'intent',
    // the query cache decides what's fresh; the router asks every time
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }
}

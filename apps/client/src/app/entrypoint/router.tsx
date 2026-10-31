import { createRouter } from '@tanstack/react-router'
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query'
import { getGlobalStartContext } from '@tanstack/react-start'
import { createSiteApi } from './site-api'
import { routeTree } from '../routeTree.gen'

/**
 * The router TanStack Start makes for every request on the server and once in the browser: file routes from `routes/`
 * (thin: a page, its loader and its head), with the api and its query cache as context. What the loaders fetched on
 * the server goes into the page and back into the browser's cache (dehydration), so nothing is asked twice.
 */
export function getRouter() {
  const api = createSiteApi()
  // the request's nonce (start.ts) goes onto every script the server writes, so the page's Content Security Policy
  // lets them run; the browser has no request context and reads the nonce from the page itself
  const nonce = getGlobalStartContext()?.nonce
  const router = createRouter({
    routeTree,
    context: api,
    ssr: nonce ? { nonce } : undefined,
    defaultPreload: 'intent',
    // the query cache decides what's fresh; the router asks every time
    defaultPreloadStaleTime: 0,
    scrollRestoration: true,
    // every unknown address is the one 404 page, with the site's header and footer (States tile 09)
    notFoundMode: 'root',
  })
  setupRouterSsrQueryIntegration({ router, queryClient: api.queryClient })
  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}

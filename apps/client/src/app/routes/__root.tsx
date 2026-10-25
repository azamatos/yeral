import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { createRootRouteWithContext, HeadContent, Outlet, Scripts, useParams, useRouter } from '@tanstack/react-router'
import type { Api } from '@yeral/sdk'
import { brand } from '@yeral/ui/brand'
import { useEffect, type ReactNode } from 'react'
import { ErrorPage } from '@/pages/error'
import { isNotOpen, NotFoundPage } from '@/pages/not-found'
import { siteLocale } from '@/shared/i18n'
import { AppProviders } from '../entrypoint/app-providers'
import { knowVisitor } from '../entrypoint/site-api'
import appCss from '../styles.css?url'

export const Route = createRootRouteWithContext<Api>()({
  // who is signed in, asked on the server with the visitor's cookie, so the header is right from the first byte; a
  // failure or a slow api leaves the header at «Log in» and the page goes on
  loader: ({ context }) => knowVisitor(context),
  // a page may carry the signed-in person (the header, the cache sent with it): never kept by a shared cache. Public
  // pages that every visitor sees alike get their own caching with them (P4 slice 5).
  headers: () => ({ 'Cache-Control': 'private, no-cache', Vary: 'Cookie' }),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'theme-color', content: '#ffffff' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      // the brand's icon (a rebrand replaces the files in @yeral/ui/brand, nothing here)
      { rel: 'icon', href: brand.tabIcon },
      { rel: 'apple-touch-icon', href: brand.touchIcon },
    ],
  }),
  shellComponent: RootDocument,
  component: Outlet,
  // a business still in review answers 404 too, with its own friendly words (book C-10)
  notFoundComponent: ({ data }) => <NotFoundPage notOpen={isNotOpen(data)} />,
  errorComponent: RootError,
})

/** The document every page shares, in the address's language (the market's main one where the address has none). */
function RootDocument({ children }: { children: ReactNode }) {
  const { lang } = useParams({ strict: false })
  const locale = siteLocale(lang)
  const { sdk } = useRouter().options.context
  return (
    <html lang={locale}>
      <head>
        <HeadContent />
      </head>
      <body>
        <AppProviders sdk={sdk} locale={locale}>
          {children}
        </AppProviders>
        <Scripts />
      </body>
    </html>
  )
}

/**
 * A failed page. The queries that failed into it are let go, so they ask again when the page comes back; Try again
 * reloads the routes, which also clears the error (TanStack Router + Query's pattern).
 */
function RootError() {
  const router = useRouter()
  const queryErrors = useQueryErrorResetBoundary()
  useEffect(() => {
    queryErrors.reset()
  }, [queryErrors])
  return <ErrorPage onRetry={() => void router.invalidate()} />
}

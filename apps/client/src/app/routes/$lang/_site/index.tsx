import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '@/pages/home'
import { siteLocale } from '@/shared/i18n'
import { pageHead } from '@/shared/lib'

// Home (book C-02), rendered on the server: a failed read leaves its part out, or to the browser to ask again.
export const Route = createFileRoute('/$lang/_site/')({
  loader: async ({ context, params }) => {
    const lang = siteLocale(params.lang)
    await Promise.all([
      context.queryClient.prefetchQuery(context.sdk.catalog.categories(lang)),
      context.queryClient.prefetchQuery(context.sdk.catalog.cities(lang)),
      context.queryClient.prefetchInfiniteQuery({ ...context.sdk.catalog.search({ lang }), retry: false }),
    ])
  },
  head: ({ params }) => pageHead(siteLocale(params.lang), { path: '', description: (t) => t('site.tagline') }),
  component: HomePage,
})

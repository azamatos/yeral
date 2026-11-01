import { createFileRoute } from '@tanstack/react-router'
import { today } from '@yeral/domain/time'
import { apiSearch, searchAddress, SearchPage } from '@/pages/search'
import { siteLocale } from '@/shared/i18n'
import { pageHead } from '@/shared/lib'

// Search (book C-03), rendered on the server: a failed read is left to the page, which asks again in the browser.
export const Route = createFileRoute('/$lang/_site/search')({
  validateSearch: searchAddress,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, params, deps }) => {
    const lang = siteLocale(params.lang)
    await Promise.all([
      context.queryClient.prefetchQuery(context.sdk.catalog.categories(lang)),
      context.queryClient.prefetchQuery(context.sdk.catalog.cities(lang)),
      context.queryClient.prefetchInfiniteQuery({ ...context.sdk.catalog.search(apiSearch(deps, lang, today())), retry: false }),
    ])
  },
  head: ({ params }) => pageHead(siteLocale(params.lang), { path: '/search', title: (t) => t('search.title') }),
  component: () => <SearchPage />,
})

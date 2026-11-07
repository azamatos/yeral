import { createFileRoute, notFound } from '@tanstack/react-router'
import { today } from '@yeral/domain/time'
import { apiSearch, searchAddress, SearchPage } from '@/pages/search'
import { siteLocale } from '@/shared/i18n'
import { pageHead } from '@/shared/lib'

// A category's page (book C-05): the search with its category, also a landing page for search engines; unknown is the 404.
export const Route = createFileRoute('/$lang/_site/c/$category')({
  validateSearch: searchAddress,
  // the header's compact SearchBar refines this page in place, the category kept (C7-Home C1)
  staticData: { searchHeader: 'results' },
  loaderDeps: ({ search }) => search,
  loader: async ({ context, params, deps }) => {
    const lang = siteLocale(params.lang)
    const [{ items }] = await Promise.all([
      context.queryClient.ensureQueryData(context.sdk.catalog.categories(lang)),
      context.queryClient.prefetchQuery(context.sdk.catalog.cities(lang)),
    ])
    const category = items.find((c) => c.id === params.category)
    if (!category) notFound({ throw: true })
    await context.queryClient.prefetchInfiniteQuery({
      ...context.sdk.catalog.search(apiSearch({ ...deps, cat: category!.id }, lang, today())),
      retry: false,
    })
    return { category: category! }
  },
  head: ({ params, loaderData }) =>
    pageHead(siteLocale(params.lang), {
      path: `/c/${params.category}`,
      title: loaderData ? () => loaderData.category.name : undefined,
      description: loaderData ? () => loaderData.category.intro : undefined,
    }),
  component: CategoryRoute,
})

function CategoryRoute() {
  const { category } = Route.useLoaderData()
  return <SearchPage category={category} />
}

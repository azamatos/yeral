import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { isApiError } from '@yeral/sdk'
import { z } from 'zod'
import { BusinessPage } from '@/pages/business'
import { NOT_OPEN } from '@/pages/not-found'
import { siteLocale } from '@/shared/i18n'
import { pageHead } from '@/shared/lib'

// The business page (book C-06, C-08–C-11), rendered on the server with the visitor's cookie (the owner's preview, a
// phone-only client). An unknown, closed or hidden business is the 404 page; one still in review is the friendly
// «This page hasn't opened yet» 404 (C-10); an old address (chapter 9, 25.10.2026) moves to the new one for good.
export const Route = createFileRoute('/$lang/_site/b/$slug')({
  // `?services=id,id`: what was picked (anything else is ignored, not an error)
  validateSearch: z.object({ services: z.string().optional().catch(undefined) }),
  loader: async ({ context, params }) => {
    const lang = siteLocale(params.lang)
    // the first reviews come with the page, read alongside it, once: a failure doesn't hold the page up with retries
    // but leaves them to the page, which tries again and says so
    const [detail] = await Promise.all([
      context.queryClient.ensureQueryData(context.sdk.catalog.business(params.slug, lang)).catch((error: unknown) => {
        // an address no page can have (capitals, `_`, too long) is refused before any lookup: no page either
        if (isApiError(error, 'not_found') || isApiError(error, 'validation_error')) notFound({ throw: true })
        if (isApiError(error, 'in_review')) notFound({ data: NOT_OPEN, throw: true })
        throw error
      }),
      context.queryClient.prefetchInfiniteQuery({ ...context.sdk.catalog.reviews(params.slug, lang), retry: false }),
    ])
    if (detail.slug !== params.slug)
      redirect({ to: '/$lang/b/$slug', params: { lang, slug: detail.slug }, search: true, statusCode: 301, throw: true })
    return { name: detail.name, category: detail.category.name, preview: detail.preview !== null }
  },
  head: ({ params, loaderData }) =>
    pageHead(siteLocale(params.lang), {
      path: `/b/${params.slug}`,
      title: loaderData ? () => loaderData.name : undefined,
      description: loaderData ? (t) => t('business.description', { name: loaderData.name, category: loaderData.category }) : undefined,
      // the owner's own page in review is theirs alone
      noindex: loaderData?.preview ?? false,
    }),
  component: BusinessPage,
})

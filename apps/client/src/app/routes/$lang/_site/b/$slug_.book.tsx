import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { isApiError } from '@yeral/sdk'
import { z } from 'zod'
import { BookingPage } from '@/pages/booking'
import { NOT_OPEN } from '@/pages/not-found'
import { siteLocale } from '@/shared/i18n'
import { pageHead } from '@/shared/lib'

// The booking flow's address (Booking: `?services=&staff=&date=&time=&step=`, book C-12); its steps come with P4
// slice 3, which gives it the focused header. Until then it stands in under the site's header.
export const Route = createFileRoute('/$lang/_site/b/$slug_/book')({
  validateSearch: z.object({
    services: z.string().optional().catch(undefined),
    step: z.enum(['services', 'staff', 'time', 'confirm']).optional().catch(undefined),
  }),
  // as the business page does: no page, a page not open yet, a page at a new address
  loader: async ({ context, params }) => {
    const lang = siteLocale(params.lang)
    const detail = await context.queryClient.ensureQueryData(context.sdk.catalog.business(params.slug, lang)).catch((error: unknown) => {
      if (isApiError(error, 'not_found') || isApiError(error, 'validation_error')) notFound({ throw: true })
      if (isApiError(error, 'in_review')) notFound({ data: NOT_OPEN, throw: true })
      throw error
    })
    if (detail.slug !== params.slug)
      redirect({ to: '/$lang/b/$slug/book', params: { lang, slug: detail.slug }, search: true, statusCode: 301, throw: true })
  },
  head: ({ params }) =>
    pageHead(siteLocale(params.lang), { path: `/b/${params.slug}/book`, title: (t) => t('business.booking.title'), noindex: true }),
  component: BookingPage,
})

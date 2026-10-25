import { createFileRoute, notFound } from '@tanstack/react-router'
import { isApiError } from '@yeral/sdk'
import { z } from 'zod'
import { BookingPage } from '@/pages/booking'
import { siteLocale } from '@/shared/i18n'
import { pageHead } from '@/shared/lib'

// The booking flow's address (Booking: `?services=&staff=&date=&time=&step=`, book C-12); its steps come with P4
// slice 3, which gives it the focused header. Until then it stands in under the site's header.
export const Route = createFileRoute('/$lang/_site/b/$slug_/book')({
  validateSearch: z.object({
    services: z.string().optional().catch(undefined),
    step: z.enum(['services', 'staff', 'time', 'confirm']).optional().catch(undefined),
  }),
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(context.sdk.catalog.business(params.slug, siteLocale(params.lang))).then(
      () => undefined,
      (error: unknown) => {
        if (isApiError(error, 'not_found') || isApiError(error, 'in_review')) notFound({ throw: true })
        throw error
      },
    ),
  head: ({ params }) =>
    pageHead(siteLocale(params.lang), { path: `/b/${params.slug}/book`, title: (t) => t('business.booking.title'), noindex: true }),
  component: BookingPage,
})

import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { isApiError } from '@yeral/sdk'
import { bookingSearchSchema, BookingPage } from '@/pages/booking'
import { NOT_OPEN } from '@/pages/not-found'
import { siteLocale } from '@/shared/i18n'
import { pageHead } from '@/shared/lib'

// The appointment booking flow (Booking, book C-12–C-14) under its focused header, outside the site's header and
// footer: `?services=&staff=&date=&time=&step=`. As the business page: no page is the 404, a page not open yet the
// friendly 404 (C-10), a page at a new address moves there for good.
export const Route = createFileRoute('/$lang/b/$slug/book')({
  validateSearch: bookingSearchSchema,
  loader: async ({ context, params }) => {
    const lang = siteLocale(params.lang)
    const detail = await context.queryClient.ensureQueryData(context.sdk.catalog.business(params.slug, lang)).catch((error: unknown) => {
      if (isApiError(error, 'not_found') || isApiError(error, 'validation_error')) notFound({ throw: true })
      if (isApiError(error, 'in_review')) notFound({ data: NOT_OPEN, throw: true })
      throw error
    })
    if (detail.slug !== params.slug)
      redirect({ to: '/$lang/b/$slug/book', params: { lang, slug: detail.slug }, search: true, statusCode: 301, throw: true })
    // nothing here to book for whoever looks: paused, a client booked by phone only, the owner's page in review (all
    // `bookOnline` false), or tables and classes (their flows come later): the page says why and how
    if (!detail.bookOnline || !detail.bookingTypes.includes('appointment'))
      redirect({ to: '/$lang/b/$slug', params: { lang, slug: detail.slug }, replace: true, throw: true })
    return { name: detail.name }
  },
  head: ({ params, loaderData }) =>
    pageHead(siteLocale(params.lang), {
      path: `/b/${params.slug}/book`,
      title: (t) => (loaderData ? t('booking.pageTitle', { name: loaderData.name }) : t('booking.title')),
      noindex: true,
    }),
  component: BookingPage,
})

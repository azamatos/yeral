import { createFileRoute } from '@tanstack/react-router'
import { BookingDrawer } from '@/pages/my-bookings'
import { siteLocale } from '@/shared/i18n'
import { pageHead } from '@/shared/lib'

// A booking in the drawer over My bookings (book C-28–C-31): the list stays under it on its tab (`?tab=` kept).
export const Route = createFileRoute('/$lang/_site/account/bookings/$code')({
  head: ({ params }) =>
    pageHead(siteLocale(params.lang), {
      path: `/account/bookings/${params.code}`,
      title: (t) => t('bookingDrawer.pageTitle', { code: params.code }),
      noindex: true,
    }),
  component: BookingDrawer,
})

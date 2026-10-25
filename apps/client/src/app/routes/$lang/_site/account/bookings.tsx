import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { MyBookingsPage } from '@/pages/my-bookings'
import { siteLocale } from '@/shared/i18n'
import { pageHead } from '@/shared/lib'

// My bookings (book C-23–C-26, C-40): Upcoming, or Past with `?tab=past` (anything else is Upcoming, not an error).
export const Route = createFileRoute('/$lang/_site/account/bookings')({
  validateSearch: z.object({ tab: z.enum(['upcoming', 'past']).optional().catch(undefined) }),
  head: ({ params }) =>
    pageHead(siteLocale(params.lang), { path: '/account/bookings', title: (t) => t('myBookings.title'), noindex: true }),
  component: MyBookingsPage,
})

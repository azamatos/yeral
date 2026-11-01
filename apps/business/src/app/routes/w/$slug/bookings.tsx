import { createFileRoute } from '@tanstack/react-router'
import { bookingsSearch, BookingsPage } from '@/pages/bookings'

export const Route = createFileRoute('/w/$slug/bookings')({ validateSearch: bookingsSearch, component: BookingsPage })

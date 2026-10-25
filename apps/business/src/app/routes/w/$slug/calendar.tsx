import { createFileRoute } from '@tanstack/react-router'
import { CalendarPage, calendarSearch } from '@/pages/calendar'

// `?date=` the day (today without it), `?cancelled=true` shows cancelled bookings, `?booking=` the one picked
export const Route = createFileRoute('/w/$slug/calendar')({ validateSearch: calendarSearch, component: CalendarPage })

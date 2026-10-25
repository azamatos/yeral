import { useSearch } from '@tanstack/react-router'
import type { BookingSearch } from '../model/flow'
import { BookingPage } from './booking-page'
import { MovePage } from './move-page'

/** `/{lang}/b/{slug}/book`: a new booking, or with `?move={code}` a confirmed appointment's new time (book C-30). */
export function BookingFlow() {
  const search: BookingSearch = useSearch({ strict: false })
  return search.move ? <MovePage /> : <BookingPage />
}

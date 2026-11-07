import { isYmd } from '@yeral/domain/time'

/**
 * The calendar's address (B-Calendar): the day (`YYYY-MM-DD`, today without it), cancelled shown, the booking picked,
 * the request open in its drawer (a new booking's or a client's move's code), the person a phone shows, the booking
 * in move mode (B-26), the new booking open with what it starts from (B-23: `staff` too, a slot's `start`, a client's
 * id, the services comma-separated).
 */
export type CalendarSearch = {
  date?: string
  cancelled?: true
  /** The statuses ticked in Filters, comma-separated (B7-Calendar · B2); none = every status. */
  status?: string
  booking?: string
  request?: string
  /** The people picked, comma-separated (B7-Calendar's PeoplePicker); with no `view`, the person a phone shows. */
  staff?: string
  move?: string
  /** Everyone's day without it; `dayOne` the day of the people in `staff`, `weekOne` one person's week, `weekAll` the team's. */
  view?: 'dayOne' | 'weekAll' | 'weekOne'
  panel?: 'new'
  start?: number
  client?: string
  services?: string
}

const VIEWS = ['dayOne', 'weekAll', 'weekOne'] as const
/** The statuses Filters can tick, in the board's order; cancelled has its own switch. */
export const FILTER_STATUSES = ['pending', 'confirmed', 'completed', 'noshow'] as const
export type FilterStatus = (typeof FILTER_STATUSES)[number]
const code = (value: unknown) => (typeof value === 'string' && value ? value : null)

/** A real day only: «2026-02-30» or anything else leaves the calendar on today. */
export function calendarSearch(search: Record<string, unknown>): CalendarSearch {
  const booking = code(search.booking)
  const request = code(search.request)
  const staff = code(search.staff)
  const move = code(search.move)
  const client = code(search.client)
  const services = code(search.services)
  const status = statusesOf(code(search.status) ?? undefined).join(',')
  const start = search.start
  return {
    ...(typeof search.date === 'string' && isYmd(search.date) ? { date: search.date } : {}),
    ...(search.cancelled === true ? { cancelled: true as const } : {}),
    ...(status ? { status } : {}),
    ...(booking ? { booking } : {}),
    ...(request ? { request } : {}),
    ...(staff ? { staff } : {}),
    ...(move ? { move } : {}),
    ...(VIEWS.find((v) => v === search.view) ? { view: search.view as (typeof VIEWS)[number] } : {}),
    ...(search.panel === 'new' ? { panel: 'new' as const } : {}),
    ...(typeof start === 'number' && Number.isInteger(start) && start >= 0 && start < 2880 ? { start } : {}),
    ...(client ? { client } : {}),
    ...(services ? { services } : {}),
  }
}

/** The people in `?staff=`: ids comma-separated, none for everyone. */
export const peopleOf = (staff: string | undefined): string[] => (staff ?? '').split(',').filter(Boolean)

/** The `view` for a range and the people picked: everyone's day has none; one person's week is `weekOne`. */
export const viewFor = (week: boolean, people: readonly string[]): CalendarSearch['view'] =>
  week ? (people.length === 1 ? 'weekOne' : 'weekAll') : people.length ? 'dayOne' : undefined

/** The statuses in `?status=`, known ones only, in the board's order; none for every status. */
export const statusesOf = (status: string | undefined): FilterStatus[] => {
  const asked = (status ?? '').split(',')
  return FILTER_STATUSES.filter((s) => asked.includes(s))
}

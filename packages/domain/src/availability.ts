/**
 * Free times (ADR 0017 "Availability"). Pure: the api loads the business, its rules, team, services and the busy
 * intervals for the dates in question, and asks these functions; the client site shows what the api returns.
 *
 * Appointment rules (client spec §2, §4.4; business spec §4, §11):
 * - several services run back to back; one specialist if possible, otherwise «Islendik hünärmen» picks per service;
 * - a buffer follows each specialist's part of the chain: the last service's override, else the business buffer;
 * - visit + buffer must fit inside working hours, outside breaks and other bookings (their buffers included);
 * - starts are multiples of the business's slot step; clients also get the lead time and the booking window,
 *   staff booking by phone don't (they choose a specialist who does every service themselves), but they get no time
 *   before the current step either: staff bookings are confirmed at once and would complete as visits that never were;
 * - pending requests block their slot until they expire, like confirmed bookings (the api passes both as busy);
 * - a day may run past midnight: starts after 24:00 belong to the day that started (minute 1500 = 01:00 next morning).
 */
import { businessDay, DAY_MINUTES, staffDay, workingIntervals, type BusinessHours, type StaffSchedule } from './hours'
import { MAX_ALTERNATIVES } from './lifecycle'
import { contains, overlaps, type Interval } from './model'
import type { BookingRules } from './rules'
import { addDays, diffDays, epochOf, localOf, today } from './time'

export interface StaffForBooking extends StaffSchedule {
  id: string
  serviceIds: readonly string[]
  /** Shown to clients and takes bookings (owner and admin usually don't). */
  bookable: boolean
  /** false once removed ("Öçürilen") or while invited. */
  active: boolean
}

export interface ServiceForBooking {
  id: string
  durationMin: number
  /** null = the business buffer. */
  bufferMin: number | null
  /** "Onlaýn ýazylmak bolýar"; staff can still book it by phone. */
  online: boolean
}

/** Time a team member is taken on a date, buffer included. */
export interface BusyInterval extends Interval {
  staffId: string
  date: string
  bookingId: string
  /**
   * The same person's booking in another workspace (book Q-272): a reserved gap, never shown with its details; its
   * `bookingId` is the other workspace's, for this engine only, never sent out.
   */
  elsewhere?: true
}

export interface AppointmentContext {
  business: BusinessHours
  rules: Pick<BookingRules, 'leadMinutes' | 'windowDays' | 'bufferMinutes' | 'slotStep'>
  /** In the business's display order: «Islendik hünärmen» tries them in this order. */
  staff: readonly StaffForBooking[]
  services: readonly ServiceForBooking[]
  busy: readonly BusyInterval[]
  now: number
}

export interface AppointmentQuery {
  date: string
  /** In the order the client picked them; they run in this order. */
  serviceIds: readonly string[]
  /** null = «Islendik hünärmen». */
  staffId: string | null
  /**
   * 'staff' = a booking made in the workspace: no lead time, window or online switch, no per-service split; the current
   * step is the earliest start (a walk-in at 11:20 can start at 11:15 with a 15-minute step).
   */
  by: 'client' | 'staff'
  /** Bookings whose time doesn't count as busy: the one being moved and a move already waiting for it (book Q-165). */
  excludeBookingIds?: readonly string[]
  /** One specialist does every service: an offered time names one person (book Q-159), so no split between people. */
  oneSpecialist?: boolean
  /** Without a chosen specialist, try this one first: an offered time keeps the client's specialist when they're free. */
  preferStaffId?: string | null
}

export interface PlannedItem extends Interval {
  serviceId: string
  staffId: string
  /** Buffer after this item: set on the last item of each specialist's part of the chain, else 0. */
  bufferAfter: number
}

export interface AppointmentSlot extends Interval {
  items: PlannedItem[]
}

/** Specialists a client can book. */
export function bookableStaff(ctx: Pick<AppointmentContext, 'staff'>): StaffForBooking[] {
  return ctx.staff.filter((s) => s.active && s.bookable && s.serviceIds.length > 0)
}

/** Specialists who do every one of the services. */
export function staffDoingAll(ctx: Pick<AppointmentContext, 'staff'>, serviceIds: readonly string[]): StaffForBooking[] {
  return bookableStaff(ctx).filter((s) => serviceIds.every((id) => s.serviceIds.includes(id)))
}

/**
 * The date is inside what the client may book: not beyond the window, and not over. Yesterday counts while its
 * business day may still run past midnight (book Q-105); its starts already gone are left out by time.
 */
export function inBookingWindow(rules: Pick<BookingRules, 'windowDays'>, date: string, now = Date.now()): boolean {
  const d = diffDays(date, today(now))
  return d >= -1 && d <= rules.windowDays
}

/** One staff member's free-time picture for a date. */
interface StaffDayView {
  staff: StaffForBooking
  working: Interval[]
  busy: Interval[]
}

/**
 * Busy time that touches a date, in that date's minutes: days may run past midnight (book Q-105), so the day before
 * (its late bookings, minus 1440) and the day after (its early ones, plus 1440) count too.
 */
export function busyOn<T extends { date: string; start: number; end: number }>(busy: readonly T[], date: string): T[] {
  const out: T[] = []
  for (const b of busy) {
    const days = diffDays(b.date, date)
    if (days === 0) out.push(b)
    else if (days === -1 || days === 1) out.push({ ...b, start: b.start + days * DAY_MINUTES, end: b.end + days * DAY_MINUTES })
  }
  return out
}

function dayViews(ctx: AppointmentContext, date: string, exclude: readonly string[] = []): Map<string, StaffDayView> {
  const views = new Map<string, StaffDayView>()
  const onDate = busyOn(ctx.busy, date)
  for (const s of bookableStaff(ctx)) {
    const day = staffDay(ctx.business, s, date)
    if (!day) continue
    const busy = onDate.filter((b) => b.staffId === s.id && !exclude.includes(b.bookingId))
    views.set(s.id, { staff: s, working: workingIntervals(day), busy })
  }
  return views
}

function isFree(view: StaffDayView, span: Interval, extra: readonly Interval[] = []): boolean {
  return view.working.some((w) => contains(w, span)) && !view.busy.some((b) => overlaps(b, span)) && !extra.some((b) => overlaps(b, span))
}

function bufferOf(ctx: AppointmentContext, svc: ServiceForBooking): number {
  return svc.bufferMin ?? ctx.rules.bufferMinutes
}

/** Lay the services out back to back from `start`, one specialist per service. */
function layOut(
  ctx: AppointmentContext,
  services: readonly ServiceForBooking[],
  staffIds: readonly string[],
  start: number,
): PlannedItem[] {
  const items: PlannedItem[] = []
  let t = start
  services.forEach((svc, i) => {
    const staffId = staffIds[i] ?? ''
    items.push({ serviceId: svc.id, staffId, start: t, end: t + svc.durationMin, bufferAfter: 0 })
    t += svc.durationMin
  })
  // the buffer follows the last item of each specialist's run
  items.forEach((it, i) => {
    const next = items[i + 1]
    if (!next || next.staffId !== it.staffId) {
      const svc = services[i]
      if (svc) it.bufferAfter = bufferOf(ctx, svc)
    }
  })
  return items
}

/** The spans a plan occupies per specialist: each run of items plus its buffer. */
function occupied(items: readonly PlannedItem[]): { staffId: string; span: Interval }[] {
  const out: { staffId: string; span: Interval }[] = []
  let runStart: number | null = null
  items.forEach((it, i) => {
    runStart ??= it.start
    const next = items[i + 1]
    if (!next || next.staffId !== it.staffId) {
      out.push({ staffId: it.staffId, span: { start: runStart, end: it.end + it.bufferAfter } })
      runStart = null
    }
  })
  return out
}

function planFits(views: Map<string, StaffDayView>, items: readonly PlannedItem[]): boolean {
  const taken: { staffId: string; span: Interval }[] = []
  for (const o of occupied(items)) {
    const view = views.get(o.staffId)
    if (!view) return false
    const mine = taken.filter((x) => x.staffId === o.staffId).map((x) => x.span)
    if (!isFree(view, o.span, mine)) return false
    taken.push(o)
  }
  return true
}

/** «Islendik hünärmen» with no single specialist free: assign per service, preferring to stay with the same person. */
function splitPlan(
  ctx: AppointmentContext,
  views: Map<string, StaffDayView>,
  services: readonly ServiceForBooking[],
  start: number,
): PlannedItem[] | null {
  const order = bookableStaff(ctx).map((s) => s.id)
  const chosen: string[] = []
  const search = (i: number): PlannedItem[] | null => {
    if (i === services.length) {
      const items = layOut(ctx, services, chosen, start)
      return planFits(views, items) ? items : null
    }
    const svc = services[i]
    if (!svc) return null
    const prev = chosen[i - 1]
    const candidates = order.filter((id) => views.get(id)?.staff.serviceIds.includes(svc.id))
    const ordered = prev && candidates.includes(prev) ? [prev, ...candidates.filter((id) => id !== prev)] : candidates
    // prune early: when the specialist changes, the runs finished so far (buffers included) must already fit; that
    // depends only on the choices before i, so it's checked once per level, not per candidate
    let prefixFits: boolean | undefined
    for (const id of ordered) {
      chosen[i] = id
      if (i > 0 && id !== prev) {
        prefixFits ??= planFits(views, layOut(ctx, services.slice(0, i), chosen.slice(0, i), start))
        if (!prefixFits) continue
      }
      const found = search(i + 1)
      if (found) return found
    }
    chosen.length = i
    return null
  }
  return search(0)
}

function resolveServices(ctx: AppointmentContext, q: AppointmentQuery): ServiceForBooking[] | null {
  if (q.serviceIds.length === 0) return null
  const out: ServiceForBooking[] = []
  for (const id of q.serviceIds) {
    const svc = ctx.services.find((s) => s.id === id)
    if (!svc || (q.by === 'client' && !svc.online)) return null
    out.push(svc)
  }
  return out
}

/** Who may do the whole chain alone, in the order to try them: the chosen one, else the preferred one first. */
function singlesFor(ctx: AppointmentContext, q: AppointmentQuery): string[] {
  if (q.staffId) return [q.staffId]
  const doingAll = staffDoingAll(ctx, q.serviceIds).map((s) => s.id)
  const prefer = q.preferStaffId
  return prefer && doingAll.includes(prefer) ? [prefer, ...doingAll.filter((id) => id !== prefer)] : doingAll
}

/** The plan for one start time, or null when it isn't free. */
function planAt(
  ctx: AppointmentContext,
  q: AppointmentQuery,
  views: Map<string, StaffDayView>,
  services: ServiceForBooking[],
  singles: readonly string[],
  start: number,
) {
  const ids = q.serviceIds
  for (const staffId of singles) {
    const view = views.get(staffId)
    if (!view || !ids.every((id) => view.staff.serviceIds.includes(id))) continue
    const items = layOut(
      ctx,
      services,
      services.map(() => staffId),
      start,
    )
    if (planFits(views, items)) return items
  }
  if (!q.staffId && q.by === 'client' && services.length > 1 && !q.oneSpecialist) return splitPlan(ctx, views, services, start)
  return null
}

/**
 * The first start the team may give now: the step that holds now (a walk-in at 11:20 starts at 11:15 with 15-minute
 * steps). Earlier would be a back-dated booking (§26 E3).
 */
export function currentStep(now: number, slotStep: number): number {
  const { date, min } = localOf(now)
  return epochOf(date, Math.floor(min / slotStep) * slotStep)
}

/** The earliest instant a start may have: now + lead time for clients, the current step for staff. */
function earliestStart(ctx: AppointmentContext, q: AppointmentQuery): number {
  if (q.by === 'client') return ctx.now + ctx.rules.leadMinutes * 60_000
  return currentStep(ctx.now, ctx.rules.slotStep)
}

/** Free starts on a date, earliest first; `only` checks that one start. Lazy, so callers can stop at the first. */
function* freeSlots(ctx: AppointmentContext, q: AppointmentQuery, only?: number): Generator<AppointmentSlot, undefined> {
  if (q.by === 'client' && !inBookingWindow(ctx.rules, q.date, ctx.now)) return
  const services = resolveServices(ctx, q)
  if (!services) return
  const day = businessDay(ctx.business, q.date)
  if (!day) return
  const views = dayViews(ctx, q.date, q.excludeBookingIds)
  if (views.size === 0) return
  const earliest = earliestStart(ctx, q)
  const step = ctx.rules.slotStep
  const total = services.reduce((sum, s) => sum + s.durationMin, 0)
  const first = Math.ceil(day.open / step) * step
  if (only !== undefined && (only < first || (only - first) % step !== 0)) return
  const singles = singlesFor(ctx, q)
  for (let start = only ?? first; start + total <= day.close; start += step) {
    if (epochOf(q.date, start) >= earliest) {
      const items = planAt(ctx, q, views, services, singles, start)
      if (items) yield { start, end: start + total, items }
    }
    if (only !== undefined) return
  }
}

/** Every free start on a date for the chosen services and specialist, with the plan behind each. */
/** Whether a day has any free start: stops at the first one (the 14-day strip, "has free time" filters). */
export function hasAppointmentSlot(ctx: AppointmentContext, q: AppointmentQuery): boolean {
  return !freeSlots(ctx, q).next().done
}

export function appointmentSlots(ctx: AppointmentContext, q: AppointmentQuery): AppointmentSlot[] {
  return [...freeSlots(ctx, q)]
}

/** The plan for one exact start, or null when it's taken (the api answers 409 slot_taken). */
export function findAppointmentSlot(ctx: AppointmentContext, q: AppointmentQuery, start: number): AppointmentSlot | null {
  return freeSlots(ctx, q, start).next().value ?? null
}

/** The one specialist a plan books, or null when its services are split between people. */
export function slotStaffId(slot: Pick<AppointmentSlot, 'items'>): string | null {
  const first = slot.items[0]?.staffId
  return first && slot.items.every((i) => i.staffId === first) ? first : null
}

/** Up to `count` free starts nearest to `start` on the same date ("Bu wagt ýaňy alyndy. Golaý boş wagtlar"). */
export function nearestSlots(ctx: AppointmentContext, q: AppointmentQuery, start: number, count = MAX_ALTERNATIVES): AppointmentSlot[] {
  return appointmentSlots(ctx, q)
    .filter((s) => s.start !== start)
    .sort((a, b) => Math.abs(a.start - start) - Math.abs(b.start - start) || a.start - b.start)
    .slice(0, count)
    .sort((a, b) => a.start - b.start)
}

/**
 * The first free start from `from` on, at most `days` days ahead ("Indiki boş wagt", "Indiki boş gün"). From today,
 * yesterday's business day comes first while it may still run past midnight; `strict` starts at `from` itself (the
 * days after a given one).
 */
export function nextFreeSlot(
  ctx: AppointmentContext,
  q: Omit<AppointmentQuery, 'date'>,
  from = today(ctx.now),
  days = ctx.rules.windowDays,
  { strict = false }: { strict?: boolean } = {},
): { date: string; slot: AppointmentSlot } | null {
  const first = from === today(ctx.now) && !strict ? addDays(from, -1) : from
  for (let i = 0; i <= days + diffDays(from, first); i++) {
    const date = addDays(first, i)
    const slot = freeSlots(ctx, { ...q, date }).next().value
    if (slot) return { date, slot }
  }
  return null
}

export type PlanProblem = 'staff_cannot_do' | 'staff_off' | 'outside_hours' | 'overlap'

/**
 * Check a plan the workspace wants to save (drag to move, "Başga wagta geçir"): why it can't be done, or null.
 * Order matches what the toast should say first.
 */
export function checkPlan(
  ctx: AppointmentContext,
  date: string,
  items: readonly PlannedItem[],
  excludeBookingIds: readonly string[] = [],
): PlanProblem | null {
  const views = dayViews(ctx, date, excludeBookingIds)
  for (const it of items) {
    const s = ctx.staff.find((x) => x.id === it.staffId)
    if (!s?.serviceIds.includes(it.serviceId)) return 'staff_cannot_do'
    if (!views.has(it.staffId)) return 'staff_off'
  }
  for (const o of occupied(items)) {
    const view = views.get(o.staffId)
    if (!view?.working.some((w) => contains(w, o.span))) return 'outside_hours'
  }
  return planFits(views, items) ? null : 'overlap'
}

/** Move a plan to a new start (and optionally to one specialist), keeping durations and buffers. */
export function shiftPlan(items: readonly PlannedItem[], start: number, staffId?: string): PlannedItem[] {
  const first = items[0]
  if (!first) return []
  const delta = start - first.start
  return items.map((it) => ({ ...it, start: it.start + delta, end: it.end + delta, staffId: staffId ?? it.staffId }))
}

/** Busy intervals a saved booking contributes (what the api loads into `AppointmentContext.busy`). */
export function busyOf(bookingId: string, date: string, items: readonly PlannedItem[]): BusyInterval[] {
  return occupied(items).map((o) => ({ bookingId, date, staffId: o.staffId, ...o.span }))
}

// ── Tables ────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Parties above this book by phone ("9 we ondan köp adam bolsa, jaň ediň"). */
export const MAX_ONLINE_PARTY = 8

export interface TableArea {
  id: string
  /** VIP rooms need at least 6 people. */
  minParty: number
  maxParty: number
  tables: readonly { id: string; seats: number }[]
}

export interface TableContext {
  business: BusinessHours
  rules: Pick<BookingRules, 'leadMinutes' | 'windowDays' | 'slotStep'>
  areas: readonly TableArea[]
  /** How long a party keeps a table. */
  sittingMinutes: number
  busy: readonly { tableId: string; date: string; start: number; end: number; bookingId: string }[]
  now: number
}

export interface TableSlot {
  start: number
  /** Areas with a free table for the party at this time. */
  areaIds: string[]
}

/** `busy`: the tables' busy time on the date, from `busyOn` (worked out once per date). */
function freeTable(
  busy: TableContext['busy'],
  area: TableArea,
  span: Interval,
  partySize: number,
  excludeBookingId?: string,
): TableArea['tables'][number] | undefined {
  return [...area.tables]
    .filter((t) => t.seats >= partySize)
    .sort((a, b) => a.seats - b.seats)
    .find((t) => !busy.some((b) => b.tableId === t.id && b.bookingId !== excludeBookingId && overlaps(b, span)))
}

export function tableSlots(ctx: TableContext, q: { date: string; partySize: number; excludeBookingId?: string }): TableSlot[] {
  if (q.partySize < 1 || q.partySize > MAX_ONLINE_PARTY) return []
  if (!inBookingWindow(ctx.rules, q.date, ctx.now)) return []
  const day = businessDay(ctx.business, q.date)
  if (!day) return []
  const working = workingIntervals(day)
  const busy = busyOn(ctx.busy, q.date)
  const earliest = ctx.now + ctx.rules.leadMinutes * 60_000
  const areas = ctx.areas.filter((a) => q.partySize >= a.minParty && q.partySize <= a.maxParty)
  const out: TableSlot[] = []
  const step = ctx.rules.slotStep
  for (let start = Math.ceil(day.open / step) * step; start + ctx.sittingMinutes <= day.close; start += step) {
    const span = { start, end: start + ctx.sittingMinutes }
    if (epochOf(q.date, start) < earliest || !working.some((w) => contains(w, span))) continue
    const areaIds = areas.filter((a) => freeTable(busy, a, span, q.partySize, q.excludeBookingId)).map((a) => a.id)
    if (areaIds.length) out.push({ start, areaIds })
  }
  return out
}

/** The table a booking gets: the smallest free one that seats the party. `excludeBookingId`: the booking being moved. */
export function assignTable(
  ctx: TableContext,
  q: { date: string; start: number; partySize: number; areaId: string; excludeBookingId?: string },
): string | null {
  const area = ctx.areas.find((a) => a.id === q.areaId)
  if (!area || q.partySize < area.minParty || q.partySize > area.maxParty) return null
  if (!tableSlots(ctx, q).some((s) => s.start === q.start && s.areaIds.includes(q.areaId))) return null
  const busy = busyOn(ctx.busy, q.date)
  return freeTable(busy, area, { start: q.start, end: q.start + ctx.sittingMinutes }, q.partySize, q.excludeBookingId)?.id ?? null
}

// ── Classes ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** A client takes at most this many seats in one booking (client spec §4.6). */
export const MAX_SEATS_PER_BOOKING = 2

export interface ClassSession {
  date: string
  start: number
  capacity: number
  /** Seats taken by pending and confirmed bookings. */
  booked: number
}

export const seatsLeft = (s: Pick<ClassSession, 'capacity' | 'booked'>) => Math.max(0, s.capacity - s.booked)

/** How many seats the stepper allows; 0 = full ("Doly"). */
export const maxSeats = (s: Pick<ClassSession, 'capacity' | 'booked'>) => Math.min(MAX_SEATS_PER_BOOKING, seatsLeft(s))

export function canBookSession(s: ClassSession, seats: number, rules: Pick<BookingRules, 'leadMinutes'>, now = Date.now()): boolean {
  return Number.isInteger(seats) && seats >= 1 && seats <= maxSeats(s) && epochOf(s.date, s.start) >= now + rules.leadMinutes * 60_000
}

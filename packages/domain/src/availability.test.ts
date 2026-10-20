import { describe, expect, it } from 'vitest'
import {
  appointmentSlots,
  assignTable,
  bookableStaff,
  busyOf,
  canBookSession,
  checkPlan,
  currentStep,
  findAppointmentSlot,
  hasAppointmentSlot,
  maxSeats,
  nearestSlots,
  nextFreeSlot,
  seatsLeft,
  shiftPlan,
  slotStaffId,
  staffDoingAll,
  tableSlots,
  type AppointmentContext,
  type AppointmentQuery,
  type BusyInterval,
  type ServiceForBooking,
  type StaffForBooking,
  type TableContext,
} from './availability'
import type { DateException, WeekHours } from './hours'
import { addDays } from './time'

// Frozen "now": Wednesday 2026-10-14, 10:00 at the business.
const NOW = Date.parse('2026-10-14T05:00:00Z')
const TODAY = '2026-10-14'
const THU = '2026-10-15'
const FRI = '2026-10-16'
const SUN = '2026-10-18'

const h = (open: number, close: number) => ({ open, close })
/** Mon–Sat 10:00–20:00, Sunday off */
const WEEK: WeekHours = [h(600, 1200), h(600, 1200), h(600, 1200), h(600, 1200), h(600, 1200), h(600, 1200), null]

const svc = (id: string, durationMin: number, over: Partial<ServiceForBooking> = {}): ServiceForBooking => ({
  id,
  durationMin,
  bufferMin: null,
  online: true,
  ...over,
})
const person = (id: string, serviceIds: string[], over: Partial<StaffForBooking> = {}): StaffForBooking => ({
  id,
  serviceIds,
  bookable: true,
  active: true,
  shift: null,
  breaks: [],
  daysOff: [],
  ...over,
})
const busy = (staffId: string, date: string, start: number, end: number, bookingId = 'b1'): BusyInterval => ({
  staffId,
  date,
  start,
  end,
  bookingId,
})

function ctx(over: Partial<AppointmentContext> & { exceptions?: DateException[] } = {}): AppointmentContext {
  const { exceptions = [], ...rest } = over
  return {
    business: { hours: WEEK, exceptions },
    rules: { leadMinutes: 60, windowDays: 30, bufferMinutes: 0, slotStep: 30 },
    staff: [person('a', ['cut'])],
    services: [svc('cut', 60), svc('color', 120, { bufferMin: 15 }), svc('beard', 30)],
    busy: [],
    now: NOW,
    ...rest,
  }
}
const q = (over: Partial<AppointmentQuery> = {}): AppointmentQuery => ({
  date: THU,
  serviceIds: ['cut'],
  staffId: 'a',
  by: 'client',
  ...over,
})
const starts = (c: AppointmentContext, query: AppointmentQuery) => appointmentSlots(c, query).map((s) => s.start)

describe('who can be booked', () => {
  const team = [
    person('a', ['cut', 'color']),
    person('b', ['cut']),
    person('c', ['cut'], { active: false }),
    person('d', ['cut'], { bookable: false }),
    person('e', []),
  ]

  it('only active, bookable specialists with services', () => {
    expect(bookableStaff({ staff: team }).map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('a specialist must do every chosen service', () => {
    expect(staffDoingAll({ staff: team }, ['cut', 'color']).map((s) => s.id)).toEqual(['a'])
  })
})

describe('appointment slots for one specialist', () => {
  it('starts after the lead time today', () => {
    const s = starts(ctx(), q({ date: TODAY }))
    expect(s[0]).toBe(660)
    expect(s.at(-1)).toBe(1140)
  })

  it('offers the whole day tomorrow on the slot step', () => {
    const s = starts(ctx(), q())
    expect(s[0]).toBe(600)
    expect(s).toContain(630)
    expect(s.at(-1)).toBe(1140)
    expect(starts(ctx({ rules: { ...ctx().rules, slotStep: 15 } }), q())).toContain(615)
  })

  it('returns nothing in the past, on a day off or beyond the booking window', () => {
    expect(starts(ctx(), q({ date: '2026-10-13' }))).toEqual([])
    expect(starts(ctx(), q({ date: SUN }))).toEqual([])
    expect(starts(ctx(), q({ date: addDays(TODAY, 31) }))).toEqual([])
    expect(starts(ctx(), q({ date: addDays(TODAY, 30) })).length).toBeGreaterThan(0)
  })

  it('keeps the buffer after a visit, both its own and the existing one’s', () => {
    // existing visit 12:00–13:00 with a 15-minute buffer takes 12:00–13:15
    const c = ctx({ rules: { ...ctx().rules, bufferMinutes: 15, slotStep: 15 }, busy: [busy('a', THU, 720, 795)] })
    const s = starts(c, q())
    expect(s).toContain(645) // 10:45 + 60 + 15 ends exactly at 12:00
    expect(s).not.toContain(660)
    expect(s).not.toContain(780)
    expect(s).toContain(795) // right after the buffer
  })

  it('needs the visit and its buffer to fit before closing', () => {
    const colorist = ctx({ staff: [person('a', ['cut', 'color'])] })
    expect(starts(colorist, q({ serviceIds: ['color'] })).at(-1)).toBe(1050) // 120 min + its 15-minute buffer ≤ 20:00
    expect(starts(ctx({ rules: { ...ctx().rules, bufferMinutes: 10 } }), q()).at(-1)).toBe(1110)
  })

  it('frees the time of the booking being moved', () => {
    const c = ctx({ busy: [busy('a', THU, 720, 780, 'b1')] })
    expect(starts(c, q())).not.toContain(720)
    expect(starts(c, q({ excludeBookingIds: ['b1'] }))).toContain(720)
  })

  it('skips breaks: Aýna’s Thursday break 13:30–14:10 leaves 14:30 free (demo data)', () => {
    const breaks = [null, null, { start: 840, end: 880 }, { start: 810, end: 850 }, null, null, null]
    const c = ctx({ staff: [person('a', ['cut'], { breaks })], rules: { ...ctx().rules, slotStep: 15 } })
    const s = starts(c, q())
    expect(s).toContain(750) // 12:30–13:30
    expect(s).not.toContain(765)
    expect(s).toContain(855) // 14:15 right after the break
    expect(s).toContain(870) // 14:30, the demo booking YR-48213
  })

  it('follows an own shift and personal days off', () => {
    const shift = [null, null, h(600, 1200), h(720, 960), null, null, null]
    const c = ctx({ staff: [person('a', ['cut'], { shift, daysOff: [{ name: 'Rugsat', from: FRI, to: FRI, yearly: false }] })] })
    expect(starts(c, q())).toEqual([720, 750, 780, 810, 840, 870, 900])
    expect(starts(c, q({ date: FRI }))).toEqual([])
  })

  it('a specialist who doesn’t do every service gets nothing', () => {
    expect(starts(ctx(), q({ serviceIds: ['cut', 'color'] }))).toEqual([])
  })

  it('"has a free time" agrees with the full list, day by day', () => {
    const shift = [null, null, h(600, 1200), h(720, 960), null, null, null]
    const c = ctx({ staff: [person('a', ['cut'], { shift, daysOff: [{ name: 'Rugsat', from: FRI, to: FRI, yearly: false }] })] })
    for (const query of [q(), q({ date: FRI }), q({ date: '2026-10-13' }), q({ serviceIds: ['cut', 'color'] })])
      expect(hasAppointmentSlot(c, query)).toBe(appointmentSlots(c, query).length > 0)
  })
})

describe('chains and «Islendik hünärmen»', () => {
  const team = [person('a', ['cut']), person('b', ['color']), person('c', ['cut', 'color'])]

  it('runs services back to back with one specialist, the buffer after the last one', () => {
    const slot = findAppointmentSlot(ctx({ staff: team }), q({ serviceIds: ['cut', 'color'], staffId: 'c' }), 600)
    expect(slot).toEqual({
      start: 600,
      end: 780,
      items: [
        { serviceId: 'cut', staffId: 'c', start: 600, end: 660, bufferAfter: 0 },
        { serviceId: 'color', staffId: 'c', start: 660, end: 780, bufferAfter: 15 },
      ],
    })
  })

  it('prefers one specialist for the whole chain', () => {
    const slot = findAppointmentSlot(ctx({ staff: team }), q({ serviceIds: ['cut', 'color'], staffId: null }), 600)
    expect(slot?.items.map((i) => i.staffId)).toEqual(['c', 'c'])
  })

  it('splits the chain across specialists when nobody can do it alone', () => {
    const c = ctx({ staff: team, busy: [busy('c', THU, 540, 1200)], rules: { ...ctx().rules, bufferMinutes: 10 } })
    const slot = findAppointmentSlot(c, q({ serviceIds: ['cut', 'color'], staffId: null }), 600)
    expect(slot?.items).toEqual([
      { serviceId: 'cut', staffId: 'a', start: 600, end: 660, bufferAfter: 10 },
      { serviceId: 'color', staffId: 'b', start: 660, end: 780, bufferAfter: 15 },
    ])
  })

  it('an offered time names one specialist: no split, the client’s own first when free (book Q-159)', () => {
    const c = ctx({ staff: team, busy: [busy('c', THU, 540, 1200)], rules: { ...ctx().rules, bufferMinutes: 10 } })
    const offer = q({ serviceIds: ['cut', 'color'], staffId: null, oneSpecialist: true })
    expect(findAppointmentSlot(c, offer, 600)).toBeNull()
    const free = ctx({ staff: [person('a', ['cut']), person('b', ['cut'])] })
    expect(slotStaffId(findAppointmentSlot(free, q({ staffId: null, oneSpecialist: true }), 600)!)).toBe('a')
    expect(slotStaffId(findAppointmentSlot(free, q({ staffId: null, oneSpecialist: true, preferStaffId: 'b' }), 600)!)).toBe('b')
    // the preferred one busy: someone else free
    const bBusy = ctx({ staff: [person('a', ['cut']), person('b', ['cut'])], busy: [busy('b', THU, 600, 660)] })
    expect(slotStaffId(findAppointmentSlot(bBusy, q({ staffId: null, preferStaffId: 'b' }), 600)!)).toBe('a')
  })

  it('slotStaffId: the one specialist of a plan, or null when it is split', () => {
    const c = ctx({ staff: team, busy: [busy('c', THU, 540, 1200)], rules: { ...ctx().rules, bufferMinutes: 10 } })
    expect(slotStaffId(findAppointmentSlot(c, q({ serviceIds: ['cut', 'color'], staffId: null }), 600)!)).toBeNull()
    expect(slotStaffId(findAppointmentSlot(ctx({ staff: team }), q({ serviceIds: ['cut', 'color'], staffId: null }), 600)!)).toBe('c')
  })

  it('a split needs every part to be free', () => {
    const c = ctx({ staff: team, busy: [busy('c', THU, 540, 1200), busy('b', THU, 660, 700)] })
    expect(findAppointmentSlot(c, q({ serviceIds: ['cut', 'color'], staffId: null }), 600)).toBeNull()
  })

  it('lists who is free at each start', () => {
    const c = ctx({ staff: [person('a', ['cut']), person('b', ['cut'])], busy: [busy('a', THU, 600, 660)] })
    const slots = appointmentSlots(c, q({ staffId: null }))
    expect(slots.find((s) => s.start === 600)?.items[0]?.staffId).toBe('b')
    expect(slots.find((s) => s.start === 900)?.items[0]?.staffId).toBe('a')
  })
})

describe('bookings made by staff', () => {
  it('ignore the lead time and the online switch', () => {
    const c = ctx({ services: [svc('cut', 60, { online: false })] })
    expect(starts(c, q({ date: TODAY }))).toEqual([])
    expect(starts(c, q({ date: TODAY, by: 'staff' }))[0]).toBe(600)
  })

  it('ignore the booking window', () => {
    expect(starts(ctx(), q({ date: addDays(TODAY, 45), by: 'staff' })).length).toBeGreaterThan(0)
  })

  it('never offer past times: they would be confirmed at once and turn into completed visits', () => {
    // 11:20 on Wednesday: a walk-in can still start in the current 30-minute step
    const c = ctx({ now: Date.parse('2026-10-14T06:20:00Z') })
    expect(starts(c, q({ date: TODAY, by: 'staff' }))[0]).toBe(660)
    expect(starts(c, q({ date: '2026-10-13', by: 'staff' }))).toEqual([])
    expect(findAppointmentSlot(c, q({ date: TODAY, by: 'staff' }), 630)).toBeNull()
  })

  it('start from the step that holds now (B-25)', () => {
    const at1120 = Date.parse('2026-10-14T06:20:00Z')
    expect(currentStep(at1120, 15)).toBe(Date.parse('2026-10-14T06:15:00Z'))
    expect(currentStep(at1120, 30)).toBe(Date.parse('2026-10-14T06:00:00Z'))
    expect(currentStep(Date.parse('2026-10-14T06:15:00Z'), 15)).toBe(Date.parse('2026-10-14T06:15:00Z'))
  })
})

describe('next and nearest free times', () => {
  const team = [person('a', ['cut']), person('b', ['cut'])]

  it('finds the earliest free start across specialists and days', () => {
    const next = nextFreeSlot(ctx({ staff: team }), { serviceIds: ['cut'], staffId: null, by: 'client' })
    expect(next?.date).toBe(TODAY)
    expect(next?.slot.start).toBe(660)
    expect(next?.slot.items[0]?.staffId).toBe('a')
  })

  it('skips days without a free start', () => {
    const c = ctx({ staff: team, exceptions: [{ name: 'Baýramçylyk', from: TODAY, to: THU, yearly: false }] })
    const next = nextFreeSlot(c, { serviceIds: ['cut'], staffId: null, by: 'client' })
    expect(next?.date).toBe(FRI)
    expect(next?.slot.start).toBe(600)
  })

  it('one start and the next free time agree with the full list of the day', () => {
    const team3 = [person('a', ['cut']), person('b', ['color']), person('c', ['cut', 'color'])]
    const c = ctx({ staff: team3, busy: [busy('c', THU, 540, 900), busy('a', THU, 720, 780), busy('b', THU, 840, 960)] })
    const query = q({ serviceIds: ['cut', 'color'], staffId: null })
    const all = appointmentSlots(c, query)
    for (let start = 540; start <= 1200; start += 15) {
      expect(findAppointmentSlot(c, query, start)).toEqual(all.find((s) => s.start === start) ?? null)
    }
    const next = nextFreeSlot(c, { serviceIds: ['cut', 'color'], staffId: null, by: 'client' }, THU)
    expect(next).toEqual({ date: THU, slot: all[0] })
  })

  it('offers the three nearest starts when one is taken', () => {
    const c = ctx({ busy: [busy('a', THU, 840, 900)] })
    expect(nearestSlots(c, q(), 840).map((s) => s.start)).toEqual([750, 780, 900])
  })
})

describe('checking a plan from the workspace', () => {
  const team = [person('a', ['cut']), person('b', ['color'])]
  const c = ctx({ staff: team, busy: [busy('a', THU, 720, 780, 'other')] })
  const plan = [{ serviceId: 'cut', staffId: 'a', start: 600, end: 660, bufferAfter: 0 }]

  it('accepts a free time', () => {
    expect(checkPlan(c, THU, plan)).toBeNull()
  })

  it.each([
    ['the specialist doesn’t do the service', shiftPlan(plan, 600, 'b'), 'staff_cannot_do'],
    ['outside working hours', shiftPlan(plan, 1170), 'outside_hours'],
    ['over another booking', shiftPlan(plan, 690), 'overlap'],
  ])('refuses %s', (_, items, problem) => {
    expect(checkPlan(c, THU, items)).toBe(problem)
  })

  it('refuses a day off', () => {
    expect(checkPlan(c, SUN, plan)).toBe('staff_off')
  })

  it('busyOf turns a saved plan into busy time, buffer included', () => {
    const items = [
      { serviceId: 'cut', staffId: 'a', start: 600, end: 660, bufferAfter: 0 },
      { serviceId: 'color', staffId: 'a', start: 660, end: 780, bufferAfter: 15 },
    ]
    expect(busyOf('b9', THU, items)).toEqual([{ bookingId: 'b9', date: THU, staffId: 'a', start: 600, end: 795 }])
  })
})

describe('tables', () => {
  const table = (over: Partial<TableContext> = {}): TableContext => ({
    business: { hours: WEEK, exceptions: [] },
    rules: { leadMinutes: 60, windowDays: 30, slotStep: 30 },
    areas: [
      {
        id: 'hall',
        minParty: 1,
        maxParty: 8,
        tables: [
          { id: 't2', seats: 2 },
          { id: 't4', seats: 4 },
          { id: 't6', seats: 6 },
        ],
      },
      { id: 'vip', minParty: 6, maxParty: 10, tables: [{ id: 'v10', seats: 10 }] },
    ],
    sittingMinutes: 120,
    busy: [],
    now: NOW,
    ...over,
  })

  it('offers times while a table for the party is free', () => {
    const slots = tableSlots(table(), { date: THU, partySize: 4 })
    expect(slots[0]).toEqual({ start: 600, areaIds: ['hall'] })
    expect(slots.at(-1)?.start).toBe(1080)
  })

  it('VIP rooms need at least 6 people; 9+ books by phone', () => {
    expect(tableSlots(table(), { date: THU, partySize: 6 })[0]?.areaIds).toEqual(['hall', 'vip'])
    expect(tableSlots(table(), { date: THU, partySize: 9 })).toEqual([])
  })

  it('gives the smallest free table that seats the party', () => {
    const t = table({ busy: [{ tableId: 't4', date: THU, start: 1140, end: 1260, bookingId: 'x' }] })
    expect(assignTable(t, { date: THU, start: 1080, partySize: 3, areaId: 'hall' })).toBe('t6')
    expect(assignTable(t, { date: THU, start: 600, partySize: 3, areaId: 'hall' })).toBe('t4')
    expect(assignTable(t, { date: THU, start: 600, partySize: 3, areaId: 'vip' })).toBeNull()
  })

  it('a moved booking doesn’t collide with its own old table', () => {
    const tables = [{ id: 't4', seats: 4 }]
    const t = table({
      areas: [{ id: 'hall', minParty: 1, maxParty: 4, tables }],
      busy: [{ tableId: 't4', date: THU, start: 1140, end: 1260, bookingId: 'mine' }],
    })
    expect(assignTable(t, { date: THU, start: 1080, partySize: 3, areaId: 'hall' })).toBeNull()
    expect(assignTable(t, { date: THU, start: 1080, partySize: 3, areaId: 'hall', excludeBookingId: 'mine' })).toBe('t4')
  })
})

describe('classes', () => {
  const session = { date: THU, start: 480, capacity: 12, booked: 11 }

  it('counts seats left and caps a booking at two', () => {
    expect(seatsLeft(session)).toBe(1)
    expect(maxSeats(session)).toBe(1)
    expect(maxSeats({ capacity: 14, booked: 11 })).toBe(2)
    expect(maxSeats({ capacity: 12, booked: 12 })).toBe(0)
  })

  it('books seats that are left, before the lead time', () => {
    expect(canBookSession(session, 1, { leadMinutes: 60 }, NOW)).toBe(true)
    expect(canBookSession(session, 2, { leadMinutes: 60 }, NOW)).toBe(false)
    expect(canBookSession({ ...session, date: TODAY, start: 630 }, 1, { leadMinutes: 60 }, NOW)).toBe(false)
  })
})

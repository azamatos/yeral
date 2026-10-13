import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  bookableStaff,
  cancelDeadline,
  freeSlots,
  nextFree,
  openState,
  salonClosedReason,
  salonHours,
  salonSlots,
  staffDoing,
  staffHours,
  staffOffReason,
  svcSummary,
  viewStatus,
  type World,
} from './logic'
import type { Booking, DateException, Salon, Staff, WeekHours } from './types'

// Frozen "now": Wednesday 2026-10-14, 10:00 in Ashgabat.
const NOW = new Date('2026-10-14T05:00:00Z')
const TODAY = '2026-10-14'
const THU = '2026-10-15'
const SUN = '2026-10-18'

const h = (open: number, close: number) => ({ open, close })
/** Mon–Sat 10:00–20:00, Sunday off */
const WEEK: WeekHours = [h(600, 1200), h(600, 1200), h(600, 1200), h(600, 1200), h(600, 1200), h(600, 1200), null]

function salon(over: Partial<Salon> = {}): Salon {
  return {
    id: 's1',
    slug: 'salon',
    name: 'Salon',
    kind: 'Салон',
    categories: ['hair'],
    city: 'Ашхабад',
    districtId: 'center',
    address: '',
    entrance: '',
    geo: { lat: 37.95, lng: 58.38 },
    photos: [],
    rating: 5,
    reviewsBase: 0,
    phone: '',
    about: '',
    amenities: [],
    hours: WEEK,
    exceptions: [],
    rules: { online: true, manual: true, minLead: 60, windowDays: 30, buffer: 0, cancelHours: 2, askReason: false, blockAfter2: false },
    since: '2026-01-01',
    demo: 'manual',
    ...over,
  }
}

function staff(over: Partial<Staff> = {}): Staff {
  return {
    id: 'st1',
    salonId: 's1',
    name: 'Айна',
    full: 'Айна Мырадова',
    roleId: 'master',
    spec: '',
    rating: 5,
    visits: 0,
    services: ['cut'],
    schedule: null,
    exceptions: [],
    active: true,
    since: '2026-01-01',
    bookable: true,
    ...over,
  }
}

function booking(over: Partial<Booking> = {}): Booking {
  return {
    id: 'b1',
    salonId: 's1',
    staffId: 'st1',
    clientId: 'c1',
    date: THU,
    start: 720,
    services: [{ id: 'cut', name: 'Стрижка', dur: 60, price: 100 }],
    dur: 60,
    price: 100,
    status: 'confirmed',
    channel: 'marketplace',
    createdAt: 0,
    ...over,
  }
}

const exception = (over: Partial<DateException>): DateException => ({ id: 'e1', name: 'Праздник', from: THU, to: THU, yearly: false, ...over })

function world({
  sal = salon(),
  team = [staff()],
  bookings = [] as Booking[],
  holds = [] as { staffId: string; date: string; start: number; dur: number; bookingId: string }[],
} = {}): World {
  return {
    salon: () => sal,
    staff: (id) => team.find((s) => s.id === id)!,
    staffOf: () => team,
    service: () => {
      throw new Error('not needed')
    },
    servicesOf: () => [],
    dayBookings: (staffId, date) => bookings.filter((b) => b.staffId === staffId && b.date === date),
    holds: (staffId, date) => holds.filter((x) => x.staffId === staffId && x.date === date),
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(NOW)
})
afterEach(() => vi.useRealTimers())

describe('viewStatus', () => {
  it('shows a confirmed visit that has ended as done', () => {
    expect(viewStatus({ status: 'confirmed', date: TODAY, start: 480, dur: 60 })).toBe('done')
  })
  it('keeps a confirmed visit that has not ended', () => {
    expect(viewStatus({ status: 'confirmed', date: TODAY, start: 570, dur: 60 })).toBe('confirmed')
  })
  it('shows a pending request whose start has passed as expired', () => {
    expect(viewStatus({ status: 'pending', date: TODAY, start: 540, dur: 60 })).toBe('expired')
    expect(viewStatus({ status: 'pending', date: THU, start: 540, dur: 60 })).toBe('pending')
  })
  it('leaves final statuses alone', () => {
    expect(viewStatus({ status: 'cancelled', date: TODAY, start: 480, dur: 60 })).toBe('cancelled')
    expect(viewStatus({ status: 'noshow', date: TODAY, start: 480, dur: 60 })).toBe('noshow')
  })
})

describe('opening hours', () => {
  it('uses the weekday hours', () => {
    expect(salonHours(salon(), THU)).toEqual(h(600, 1200))
    expect(salonHours(salon(), SUN)).toBeNull()
  })

  it('closes on an exception, and a yearly exception repeats every year', () => {
    expect(salonHours(salon({ exceptions: [exception({})] }), THU)).toBeNull()
    const newYear = exception({ name: 'Новый год', from: '2025-12-31', to: '2026-01-01', yearly: true })
    expect(salonHours(salon({ exceptions: [newYear] }), '2027-01-01')).toBeNull()
    expect(salonHours(salon({ exceptions: [newYear] }), '2027-01-04')).toEqual(h(600, 1200))
  })

  it('says why the salon is closed', () => {
    expect(salonClosedReason(salon(), THU)).toBeNull()
    expect(salonClosedReason(salon(), SUN)).toBe('dayoff')
    expect(salonClosedReason(salon({ exceptions: [exception({})] }), THU)).toBe('Праздник')
  })

  it('intersects a master’s own schedule with the salon hours', () => {
    const own: WeekHours = [null, null, null, h(540, 900), h(900, 1300), null, null]
    expect(staffHours(salon(), staff({ schedule: own }), THU)).toEqual(h(600, 900))
    expect(staffHours(salon(), staff({ schedule: own }), '2026-10-16')).toEqual(h(900, 1200))
    expect(staffHours(salon(), staff({ schedule: own }), TODAY)).toBeNull()
    expect(staffHours(salon(), staff({ schedule: [h(400, 600), ...WEEK.slice(1)] }), '2026-10-12')).toBeNull()
  })

  it('says why a master is off', () => {
    expect(staffOffReason(salon(), staff(), THU)).toBeNull()
    expect(staffOffReason(salon(), staff(), SUN)).toBe('salon-closed')
    expect(staffOffReason(salon(), staff({ exceptions: [exception({ name: 'Отпуск' })] }), THU)).toBe('Отпуск')
    expect(staffOffReason(salon(), staff({ schedule: [...WEEK.slice(0, 3), null, ...WEEK.slice(4)] }), THU)).toBe('dayoff')
  })
})

describe('who can be booked', () => {
  const team = [
    staff({ id: 'a', services: ['cut', 'color'] }),
    staff({ id: 'b', services: ['cut'] }),
    staff({ id: 'c', services: ['cut'], active: false }),
    staff({ id: 'd', services: ['cut'], bookable: false }),
    staff({ id: 'e', services: [] }),
  ]

  it('only active, bookable masters with services', () => {
    expect(bookableStaff(world({ team }), 's1').map((s) => s.id)).toEqual(['a', 'b'])
  })

  it('a master must do every chosen service', () => {
    expect(staffDoing(world({ team }), 's1', ['cut', 'color']).map((s) => s.id)).toEqual(['a'])
  })
})

describe('freeSlots', () => {
  it('starts after the minimum lead time today', () => {
    const slots = freeSlots(world(), 'st1', TODAY, 60)
    expect(slots[0]).toBe(660)
    expect(slots.at(-1)).toBe(1140)
  })

  it('offers the whole day tomorrow on a 30-minute grid', () => {
    const slots = freeSlots(world(), 'st1', THU, 60)
    expect(slots[0]).toBe(600)
    expect(slots).toContain(630)
    expect(slots.at(-1)).toBe(1140)
  })

  it('returns nothing in the past, on a day off or beyond the booking window', () => {
    expect(freeSlots(world(), 'st1', '2026-10-13', 60)).toEqual([])
    expect(freeSlots(world(), 'st1', SUN, 60)).toEqual([])
    expect(freeSlots(world(), 'st1', addDaysStr(TODAY, 31), 60)).toEqual([])
    expect(freeSlots(world(), 'st1', addDaysStr(TODAY, 30), 60).length).toBeGreaterThan(0)
  })

  it('keeps the buffer after a visit and offers the first start right after it', () => {
    const sal = salon({ rules: { ...salon().rules, buffer: 15 } })
    const slots = freeSlots(world({ sal, bookings: [booking({ start: 720, dur: 60 })] }), 'st1', THU, 60)
    expect(slots).toContain(630) // 10:30 + 60 + 15 buffer ends exactly at 12:00
    expect(slots).not.toContain(660)
    expect(slots).not.toContain(780)
    expect(slots).toContain(795) // 12:00 + 60 + 15 → 13:15
    expect(slots).toContain(810)
  })

  it('ignores cancelled bookings and the booking being moved', () => {
    expect(freeSlots(world({ bookings: [booking({ status: 'cancelled' })] }), 'st1', THU, 60)).toContain(720)
    expect(freeSlots(world({ bookings: [booking()] }), 'st1', THU, 60)).not.toContain(720)
    expect(freeSlots(world({ bookings: [booking()] }), 'st1', THU, 60, 'b1')).toContain(720)
  })

  it('treats a pending proposal as busy', () => {
    const holds = [{ staffId: 'st1', date: THU, start: 900, dur: 60, bookingId: 'b9' }]
    expect(freeSlots(world({ holds }), 'st1', THU, 60)).not.toContain(900)
    expect(freeSlots(world({ holds }), 'st1', THU, 60, 'b9')).toContain(900)
  })

  it('needs the whole service to fit before closing', () => {
    expect(freeSlots(world(), 'st1', THU, 120).at(-1)).toBe(1080)
  })
})

describe('salonSlots and nextFree', () => {
  const team = [staff({ id: 'a' }), staff({ id: 'b' })]

  it('lists who is free at each start', () => {
    const slots = salonSlots(world({ team, bookings: [booking({ staffId: 'a', start: 600 })] }), 's1', ['cut'], THU, 60)
    expect(slots.find((s) => s.start === 600)?.staff).toEqual(['b'])
    expect(slots.find((s) => s.start === 900)?.staff).toEqual(['a', 'b'])
  })

  it('finds the earliest free start across masters and days', () => {
    expect(nextFree(world({ team }), ['a', 'b'], 60)).toEqual({ date: TODAY, start: 660, staffId: 'a' })
  })

  it('skips days without a free start', () => {
    const sal = salon({ exceptions: [exception({ from: TODAY, to: THU })] })
    expect(nextFree(world({ sal, team }), ['a'], 60)).toEqual({ date: '2026-10-16', start: 600, staffId: 'a' })
  })
})

describe('openState', () => {
  it('is open until closing time', () => {
    expect(openState(salon())).toEqual({ open: true, until: 1200 })
  })

  it('opens later today before opening time', () => {
    vi.setSystemTime(new Date('2026-10-14T03:00:00Z')) // 08:00
    expect(openState(salon())).toEqual({ open: false, inDays: 0, at: 600 })
  })

  it('opens on the next working day after closing', () => {
    vi.setSystemTime(new Date('2026-10-17T16:00:00Z')) // Saturday 21:00, Sunday off
    expect(openState(salon())).toEqual({ open: false, inDays: 2, at: 600 })
  })

  it('has no opening when every day is off', () => {
    expect(openState(salon({ hours: [null, null, null, null, null, null, null] }))).toEqual({ open: false, inDays: null })
  })
})

describe('cancelDeadline', () => {
  it('is N hours before the start', () => {
    expect(cancelDeadline(2, { date: THU, start: 720 })).toEqual({ date: THU, min: 600 })
  })
  it('crosses midnight into the previous day', () => {
    expect(cancelDeadline(2, { date: THU, start: 60 })).toEqual({ date: TODAY, min: 1380 })
    expect(cancelDeadline(26, { date: THU, start: 60 })).toEqual({ date: '2026-10-13', min: 1380 })
  })
})

describe('svcSummary', () => {
  it('joins several services into one line', () => {
    const svc = (name: string) => ({ id: name, name, dur: 30, price: 10 })
    expect(svcSummary({ services: [svc('Стрижка')] })).toBe('Стрижка')
    expect(svcSummary({ services: [svc('Стрижка'), svc('Борода')] })).toBe('Стрижка + борода')
  })
})

function addDaysStr(d: string, n: number) {
  const x = new Date(`${d}T00:00:00Z`)
  x.setUTCDate(x.getUTCDate() + n)
  return x.toISOString().slice(0, 10)
}

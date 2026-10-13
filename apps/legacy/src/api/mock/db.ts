/**
 * Mock database.
 *
 * - The catalogue (salons, services, staff, seeded reviews) comes from seed.ts and is identical on server and client.
 * - Mutable state (users, bookings, reviews, favourites, notifications) lives in localStorage in the browser
 *   and in memory on the server (where it is always pristine). Tabs stay in sync via the storage event,
 *   so the future business workspace in another tab sees the same bookings.
 * - Background occupancy of every master is synthetic and deterministic per (staff, day): we don't store
 *   thousands of fake bookings, we generate them on the fly. Stored bookings always win.
 */
import type { Booking, Notif, Review, SalonClient, Staff, User } from '@/domain/types'
import type { World } from '@/domain/logic'
import { addDays, diffDays, dow, today, nowMin } from '@/domain/time'
import { catalog, hash, rng } from './seed'

const KEY = 'yeral-web-v1'
const VERSION = 1
export const DEMO_PHONE = '+993 65 12 34 56'

export interface MockState {
  version: number
  users: User[]
  sessionUserId: string | null
  bookings: Booking[]
  clients: SalonClient[]
  reviews: Review[]
  favorites: Record<string, string[]>
  notifs: Notif[]
}

function initialState(): MockState {
  const t = today()
  const me: User = { id: 'u_me', name: 'Тимур Абдиев', phone: DEMO_PHONE, birthday: '1994-03-14', gender: 'm', notif: { push: true, smsStatus: true, smsReminder: false } }
  const svc = (id: string) => {
    const s = catalog().services.find((x) => x.id === id)!
    return { id: s.id, name: s.name, dur: s.dur, price: s.price }
  }
  const s2all = catalog().services.filter((x) => x.salonId === 's2')
  const s2svc = s2all.find((x) => x.name === 'Мужская стрижка') ?? s2all[0]
  const s2staff = catalog().staff.find((x) => x.salonId === 's2' && x.services.includes(s2svc.id))!
  const notSunday = (d: string) => (dow(d) === 6 ? addDays(d, 1) : d)
  const mk = (b: Partial<Booking> & Pick<Booking, 'id' | 'salonId' | 'staffId' | 'date' | 'start' | 'services' | 'status' | 'channel'>): Booking => ({
    clientId: `c_me_${b.salonId}`, userId: me.id, dur: b.services.reduce((a, x) => a + x.dur, 0), price: b.services.reduce((a, x) => a + x.price, 0), createdAt: Date.now() - 86400000 * 3, ...b,
  })
  const bookings: Booking[] = [
    mk({ id: 'b_me1', salonId: 's1', staffId: 'st1', date: addDays(t, -60), start: 15 * 60, services: [svc('sv1'), svc('sv6')], status: 'confirmed', channel: 'marketplace', comment: 'Подстричь короче по бокам, сверху оставить', reviewId: 'r_me1' }),
    mk({ id: 'b_me2', salonId: 's1', staffId: 'st2', date: addDays(t, -81), start: 12 * 60 + 30, services: [svc('sv1')], status: 'cancelled', cancelledBy: 'client', reason: 'Планы изменились', channel: 'marketplace' }),
    mk({ id: 'b_me3', salonId: 's1', staffId: 'st1', date: addDays(t, -27), start: 15 * 60, services: [svc('sv1'), svc('sv6')], status: 'confirmed', channel: 'direct' }),
    mk({ id: 'b_me4', salonId: 's1', staffId: 'st1', date: notSunday(addDays(t, 2)), start: 11 * 60 + 30, services: [svc('sv1')], status: 'confirmed', channel: 'phone', createdAt: Date.now() - 3600000 * 20, confirmedAt: Date.now() - 3600000 * 20 }),
    mk({ id: 'b_me5', salonId: 's2', staffId: s2staff.id, date: addDays(t, 5), start: 18 * 60, services: [{ id: s2svc.id, name: s2svc.name, dur: s2svc.dur, price: s2svc.price }], status: 'confirmed', channel: 'marketplace', confirmedAt: Date.now() - 86400000 }),
  ]
  const reviews: Review[] = [
    { id: 'r_me1', salonId: 's1', staffId: 'st1', clientName: 'Тимур А.', userId: me.id, bookingId: 'b_me1', rating: 5, text: 'Сделал ровно как просил, без лишних разговоров. Приду ещё.', tags: ['Результат', 'Пунктуальность'], date: addDays(t, -60), svc: 'Стрижка + борода', createdAt: Date.now() - 86400000 * 60 },
  ]
  return {
    version: VERSION,
    users: [me],
    sessionUserId: null,
    bookings,
    clients: [
      { id: 'c_me_s1', salonId: 's1', name: 'Тимур А.', phone: DEMO_PHONE, source: 'Yeral', since: addDays(t, -95) },
      { id: 'c_me_s2', salonId: 's2', name: 'Тимур А.', phone: DEMO_PHONE, source: 'Yeral', since: addDays(t, -120) },
    ],
    reviews,
    favorites: { u_me: ['s1', 's3'] },
    notifs: [
      { id: 'n_seed1', to: 'client', title: 'Ножницы записали вас', body: 'Мырат ждёт вас — запись по телефону. Если это не вы, сообщите салону.', bookingId: 'b_me4', ts: Date.now() - 3600000 * 20, read: false },
    ],
  }
}

/* ───────────── storage ───────────── */

const isBrowser = typeof window !== 'undefined'
let state: MockState | null = null
const listeners = new Set<() => void>()

function load(): MockState {
  if (!isBrowser) return initialState()
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as MockState
      if (s.version === VERSION) return s
    }
  } catch {
    /* corrupted or blocked storage: start fresh */
  }
  const s = initialState()
  persist(s)
  return s
}

function persist(s: MockState) {
  if (!isBrowser) return
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch (e) {
    console.warn('[mock] save failed', e)
  }
}

export function getState(): MockState {
  if (!state) state = load()
  return state
}

/** Mutate a draft, persist, notify this tab (other tabs get the storage event). */
export function mutate<T>(fn: (d: MockState) => T): T {
  const draft = structuredClone(getState())
  const out = fn(draft)
  state = draft
  persist(draft)
  dayCache.clear()
  listeners.forEach((l) => l())
  return out
}

export function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function resetDemo() {
  state = initialState()
  persist(state)
  dayCache.clear()
  listeners.forEach((l) => l())
}

if (isBrowser) {
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return
    state = null
    dayCache.clear()
    listeners.forEach((l) => l())
  })
}

/* ───────────── synthetic occupancy ───────────── */

const dayCache = new Map<string, Booking[]>()

function synthetic(st: Staff, date: string, stored: Booking[]): Booking[] {
  const cat = catalog()
  const sal = cat.salons.find((x) => x.id === st.salonId)!
  const d = diffDays(date, today())
  const popularity = 0.8 + Math.min(1, sal.reviewsBase / 220) * 0.35
  const density = (d <= 0 ? 0.58 : Math.max(0.1, 0.52 - d * 0.03)) * popularity
  const r = rng(hash(st.id + date))
  const own = cat.services.filter((x) => st.services.includes(x.id))
  if (!own.length) return []
  const sched = (st.schedule ?? sal.hours)[dow(date)]
  if (!sched) return []
  const out: Booking[] = []
  let cur = sched.open + Math.floor(r() * 3) * 15
  while (cur < sched.close) {
    if (r() < density) {
      const sv = r() < 0.45 ? own[0] : own[Math.floor(r() * own.length)]
      if (cur + sv.dur > sched.close) break
      const clash = stored.some((b) => cur < b.start + b.dur + 15 && cur + sv.dur + 15 > b.start)
      if (!clash) {
        out.push({
          id: `syn_${st.id}_${date}_${cur}`, salonId: st.salonId, staffId: st.id, clientId: 'synthetic', date, start: cur,
          services: [{ id: sv.id, name: sv.name, dur: sv.dur, price: sv.price }], dur: sv.dur, price: sv.price,
          status: 'confirmed', channel: r() < 0.55 ? 'marketplace' : 'phone', createdAt: Date.parse(date) - 86400000 * 2,
        })
      }
      cur = Math.ceil((cur + sv.dur + sal.rules.buffer) / 15) * 15
    } else cur += 30 + Math.floor(r() * 3) * 15
  }
  return out
}

/* ───────────── the World the booking rules run against ───────────── */

export function world(): World {
  const cat = catalog()
  const s = getState()
  const salonMap = new Map(cat.salons.map((x) => [x.id, x]))
  const staffMap = new Map(cat.staff.map((x) => [x.id, x]))
  const svcMap = new Map(cat.services.map((x) => [x.id, x]))
  return {
    salon: (id) => salonMap.get(id)!,
    staff: (id) => staffMap.get(id)!,
    staffOf: (salonId) => cat.staff.filter((x) => x.salonId === salonId),
    service: (id) => svcMap.get(id)!,
    servicesOf: (salonId) => cat.services.filter((x) => x.salonId === salonId && !x.deleted),
    dayBookings(staffId, date) {
      const k = `${staffId}|${date}`
      let v = dayCache.get(k)
      if (!v) {
        const stored = s.bookings.filter((b) => b.staffId === staffId && b.date === date)
        v = [...stored, ...synthetic(staffMap.get(staffId)!, date, stored)].sort((a, b) => a.start - b.start)
        dayCache.set(k, v)
      }
      return v
    },
    holds: (staffId, date) =>
      s.bookings.filter((b) => b.proposal && b.proposal.staffId === staffId && b.proposal.date === date).map((b) => ({ start: b.proposal!.start, dur: b.dur, bookingId: b.id })),
  }
}

/** Light simulated network latency in the browser, so loading states get designed. */
export function latency(min = 120, max = 320): Promise<void> {
  if (!isBrowser) return Promise.resolve()
  return new Promise((r) => setTimeout(r, min + Math.random() * (max - min)))
}

export { nowMin }

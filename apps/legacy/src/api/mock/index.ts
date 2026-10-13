/**
 * In-browser implementation of the Api contract. Business rules come from src/domain;
 * this file only plays the role of the backend: auth, persistence, notifications to the other side.
 */
import type { Api, BookingView, NotificationView, ReviewPublic, SalonCard, SalonDetail, SearchParams } from '../contract'
import type { Booking, Notif, Review, Salon } from '@/domain/types'
import { bookableStaff, cancelDeadline, freeSlots, nextFree, openState, salonClosedReason, salonSlots, staffDoing, staffOffReason, svcSummary, viewStatus } from '@/domain/logic'
import { addDays, diffDays, hm, minutesUntil, normPhone, today, uid } from '@/domain/time'
import { DISTRICTS, catalog } from './seed'
import { DEMO_PHONE, getState, latency, mutate, world, type MockState } from './db'

const districtName = (id: string) => DISTRICTS.find((d) => d.id === id)?.name ?? ''

function rating(s: MockState, sal: Salon) {
  const extra = [...catalog().reviews, ...s.reviews].filter((r) => r.salonId === sal.id)
  const count = sal.reviewsBase + extra.length
  const avg = (sal.rating * sal.reviewsBase + extra.reduce((a, r) => a + r.rating, 0)) / Math.max(1, count)
  return { avg: Math.round(avg * 10) / 10, count }
}

const popularity = (() => {
  // how often each service is booked across the synthetic week — drives «popular» ordering
  let memo: { day: string; map: Map<string, number> } | null = null
  return (): Map<string, number> => {
    if (memo?.day === today()) return memo.map
    const w = world()
    const map = new Map<string, number>()
    for (const st of catalog().staff) for (let i = 0; i < 7; i++) w.dayBookings(st.id, addDays(today(), i)).forEach((b) => b.services.forEach((x) => map.set(x.id, (map.get(x.id) ?? 0) + 1)))
    memo = { day: today(), map }
    return map
  }
})()

function card(s: MockState, sal: Salon, match?: (name: string) => boolean): SalonCard {
  const menu = catalog().services.filter((x) => x.salonId === sal.id && x.online && !x.deleted)
  const pop = popularity()
  const sorted = [...menu].sort((a, b) => (pop.get(b.id) ?? 0) - (pop.get(a.id) ?? 0))
  const top = (match ? sorted.filter((x) => match(x.name)) : []).concat(sorted).filter((x, i, a) => a.indexOf(x) === i).slice(0, 3)
  return {
    id: sal.id, slug: sal.slug, name: sal.name, kind: sal.kind, categories: sal.categories, district: districtName(sal.districtId), districtId: sal.districtId,
    address: sal.address, geo: sal.geo, photos: sal.photos, rating: rating(s, sal),
    minPrice: menu.length ? Math.min(...menu.map((x) => x.price)) : 0,
    services: top.map(({ id, name, dur, price, priceFrom }) => ({ id, name, dur, price, priceFrom })),
    online: sal.rules.online, isNew: diffDays(today(), sal.since) < 30, instant: !sal.rules.manual,
  }
}

function detail(s: MockState, sal: Salon): SalonDetail {
  const w = world()
  const reviews = [...catalog().reviews, ...s.reviews].filter((r) => r.salonId === sal.id)
  const dist = [5, 4, 3, 2, 1].map((n) => reviews.filter((r) => r.rating === n).length)
  return {
    ...card(s, sal),
    phone: sal.phone, instagram: sal.instagram, about: sal.about, entrance: sal.entrance, amenities: sal.amenities,
    hours: sal.hours, exceptions: sal.exceptions, cancelHours: sal.rules.cancelHours, windowDays: sal.rules.windowDays,
    menu: w.servicesOf(sal.id).filter((x) => x.online),
    staff: bookableStaff(w, sal.id).map(({ id, name, spec, rating, visits, services }) => ({ id, name, spec, rating, visits, services })),
    ratingDist: dist,
  }
}

function me(s: MockState) {
  return s.users.find((u) => u.id === s.sessionUserId) ?? null
}

function requireMe(s: MockState) {
  const u = me(s)
  if (!u) throw new Error('auth')
  return u
}

function notify(d: MockState, n: Omit<Notif, 'id' | 'ts' | 'read'>) {
  d.notifs.unshift({ ...n, id: uid('n'), ts: Date.now(), read: false })
  d.notifs = d.notifs.slice(0, 80)
}

const whenLabel = (date: string, start: number) => {
  const dd = diffDays(date, today())
  const rel = dd === 0 ? 'сегодня' : dd === 1 ? 'завтра' : new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(Date.parse(date))
  return `${rel}, ${hm(start)}`
}

function view(s: MockState, b: Booking): BookingView {
  const sal = catalog().salons.find((x) => x.id === b.salonId)!
  const staff = catalog().staff
  return {
    ...b,
    salon: { id: sal.id, slug: sal.slug, name: sal.name, kind: sal.kind, address: sal.address, district: districtName(sal.districtId), photo: sal.photos[0], phone: sal.phone, cancelHours: sal.rules.cancelHours },
    staffName: staff.find((x) => x.id === b.staffId)?.name ?? '',
    proposalStaffName: b.proposal ? staff.find((x) => x.id === b.proposal!.staffId)?.name : undefined,
    view: viewStatus(b),
  }
}

/** Salons without a connected business app answer by themselves after a few seconds. */
export function demoTick() {
  const s = getState()
  const due = s.bookings.filter((b) => b.status === 'pending' && Date.now() - b.createdAt > 6000 && catalog().salons.find((x) => x.id === b.salonId)?.demo === 'auto')
  if (!due.length) return
  mutate((d) => {
    due.forEach(({ id }) => {
      const b = d.bookings.find((x) => x.id === id)!
      b.status = 'confirmed'
      b.confirmedAt = Date.now()
      const sal = catalog().salons.find((x) => x.id === b.salonId)!
      notify(d, { to: 'client', title: `${sal.name}: запись подтверждена`, body: `Ждём вас ${whenLabel(b.date, b.start)}.`, bookingId: b.id })
    })
  })
}

/** Plays the salon in the demo panel (until the business workspace exists). */
export const demoSalon = {
  confirm(id: string) {
    mutate((d) => {
      const b = d.bookings.find((x) => x.id === id)!
      b.status = 'confirmed'
      b.confirmedAt = Date.now()
      const sal = catalog().salons.find((x) => x.id === b.salonId)!
      const st = catalog().staff.find((x) => x.id === b.staffId)!
      notify(d, { to: 'client', title: `${sal.name}: запись подтверждена`, body: `${st.name} ждёт вас ${whenLabel(b.date, b.start)}. Место за вами.`, bookingId: b.id })
    })
  },
  decline(id: string, reason: string) {
    mutate((d) => {
      const b = d.bookings.find((x) => x.id === id)!
      b.status = 'declined'
      b.cancelledBy = 'salon'
      b.reason = reason
      const sal = catalog().salons.find((x) => x.id === b.salonId)!
      notify(d, { to: 'client', title: `${sal.name} не смог принять`, body: `«${reason}»`, bookingId: b.id })
    })
  },
  propose(id: string) {
    const s = getState()
    const b = s.bookings.find((x) => x.id === id)!
    const w = world()
    // the next free window of the same master, at least an hour later
    let target: { date: string; start: number } | null = null
    for (let i = 0; i < 7 && !target; i++) {
      const date = addDays(b.date, i)
      const m = freeSlots(w, b.staffId, date, b.dur, b.id).find((x) => i > 0 || x >= b.start + 60)
      if (m !== undefined) target = { date, start: m }
    }
    if (!target) return false
    mutate((d) => {
      const x = d.bookings.find((y) => y.id === id)!
      x.proposal = { ...target!, staffId: x.staffId }
      notify(d, { to: 'client', title: 'Салон предлагает другое время', body: `${catalog().staff.find((y) => y.id === x.staffId)!.name} просит перенести на ${whenLabel(target!.date, target!.start)}`, bookingId: x.id })
    })
    return true
  },
}

function matchesQuery(sal: Salon, q: string) {
  const services = catalog().services.filter((x) => x.salonId === sal.id && !x.deleted)
  return [sal.name, sal.kind, districtName(sal.districtId), sal.address, ...services.map((x) => x.name)].some((x) => x.toLowerCase().includes(q))
}

export const mockApi: Api = {
  catalog: {
    async districts() {
      return DISTRICTS
    },
    async search(p: SearchParams) {
      await latency()
      const s = getState()
      const w = world()
      const q = p.q?.trim().toLowerCase()
      let xs = catalog().salons.filter((sal) => {
        if (p.category && !sal.categories.includes(p.category)) return false
        if (p.district && sal.districtId !== p.district) return false
        if (q && !matchesQuery(sal, q)) return false
        if (p.openNow && !openState(sal).open) return false
        if (p.instant && (sal.rules.manual || !sal.rules.online)) return false
        if (p.bounds) {
          const { n, s: so, e, w: we } = p.bounds
          if (sal.geo.lat > n || sal.geo.lat < so || sal.geo.lng > e || sal.geo.lng < we) return false
        }
        return true
      })
      if (p.date) {
        xs = xs.filter((sal) => {
          if (!sal.rules.online) return false
          return bookableStaff(w, sal.id).some((st) => freeSlots(w, st.id, p.date!, 30).length > 0)
        })
      }
      const cards = xs.map((sal) => card(s, sal, q ? (n) => n.toLowerCase().includes(q) : p.category ? (n) => catalog().services.some((x) => x.salonId === sal.id && x.name === n && x.category === p.category) : undefined))
      const sort = p.sort ?? 'recommended'
      const score = (c: SalonCard) => c.rating.avg * 2 + Math.log10(c.rating.count + 1) + (c.online ? 1 : -3) + (c.isNew ? 0.4 : 0)
      cards.sort((a, b) => (sort === 'rating' ? b.rating.avg - a.rating.avg || b.rating.count - a.rating.count : sort === 'price' ? a.minPrice - b.minPrice : score(b) - score(a)))
      return { items: cards, total: cards.length }
    },
    async salon(slug) {
      const sal = catalog().salons.find((x) => x.slug === slug)
      return sal ? detail(getState(), sal) : null
    },
    async slugs() {
      return catalog().salons.map((x) => x.slug)
    },
    async reviews(salonId) {
      await latency()
      const s = getState()
      const u = me(s)
      const staff = catalog().staff
      return [...s.reviews, ...catalog().reviews]
        .filter((r) => r.salonId === salonId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((r) => ({ id: r.id, clientName: r.clientName, rating: r.rating, text: r.text, tags: r.tags, date: r.date, svc: r.svc, staffName: staff.find((x) => x.id === r.staffId)?.name, answer: r.answer, mine: !!u && r.userId === u.id }))
    },
    async similar(salonId) {
      const s = getState()
      const sal = catalog().salons.find((x) => x.id === salonId)!
      return catalog()
        .salons.filter((x) => x.id !== salonId && x.categories.some((c) => sal.categories.includes(c)))
        .map((x) => ({ x, d: Math.hypot(x.geo.lat - sal.geo.lat, x.geo.lng - sal.geo.lng) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 4)
        .map(({ x }) => card(s, x))
    },
    async suggest(q) {
      const s = getState()
      const ql = q.trim().toLowerCase()
      if (!ql) return { services: [], salons: [] }
      const names = new Map<string, Set<string>>()
      catalog().services.forEach((x) => x.name.toLowerCase().includes(ql) && names.set(x.name, (names.get(x.name) ?? new Set()).add(x.salonId)))
      return {
        services: [...names.entries()].slice(0, 6).map(([name, set]) => ({ name, salons: set.size })),
        salons: catalog().salons.filter((x) => x.name.toLowerCase().includes(ql) || x.kind.toLowerCase().includes(ql)).slice(0, 5).map((x) => card(s, x)),
      }
    },
  },

  availability: {
    async day(q) {
      await latency(80, 200)
      const w = world()
      const sal = w.salon(q.salonId)
      const dur = q.serviceIds.reduce((a, id) => a + w.service(id).dur, 0)
      if (q.staffId) {
        const st = w.staff(q.staffId)
        const closed = staffOffReason(sal, st, q.date)
        return { date: q.date, closed, slots: closed ? [] : freeSlots(w, st.id, q.date, dur, q.excludeBookingId).map((start) => ({ start, staff: [st.id] })) }
      }
      const closed = salonClosedReason(sal, q.date)
      return { date: q.date, closed, slots: closed ? [] : salonSlots(w, q.salonId, q.serviceIds, q.date, dur) }
    },
    async days(q) {
      await latency(80, 200)
      const w = world()
      const sal = w.salon(q.salonId)
      const dur = q.serviceIds.reduce((a, id) => a + w.service(id).dur, 0)
      const staff = q.staffId ? [w.staff(q.staffId)] : staffDoing(w, q.salonId, q.serviceIds)
      return Array.from({ length: q.days }, (_, i) => {
        const date = addDays(q.from, i)
        const closed = q.staffId ? staffOffReason(sal, staff[0], date) : salonClosedReason(sal, date)
        const set = new Set<number>()
        if (!closed) staff.forEach((st) => freeSlots(w, st.id, date, dur, q.excludeBookingId).forEach((m) => set.add(m)))
        return { date, count: set.size, closed }
      })
    },
    async nextFree(salonId, staffId) {
      const w = world()
      const sal = w.salon(salonId)
      if (!sal.rules.online) return null
      const ids = staffId ? [staffId] : bookableStaff(w, salonId).map((x) => x.id)
      const dur = Math.min(...w.servicesOf(salonId).map((x) => x.dur), 45)
      return nextFree(w, ids, dur, today(), 14)
    },
    async nextFreeMany(salonIds, date) {
      await latency(60, 160)
      const w = world()
      const out: Record<string, number[]> = {}
      for (const id of salonIds) {
        const sal = w.salon(id)
        if (!sal.rules.online) {
          out[id] = []
          continue
        }
        const d = date ?? today()
        const set = new Set<number>()
        bookableStaff(w, id).forEach((st) => freeSlots(w, st.id, d, 30).forEach((m) => set.add(m)))
        out[id] = [...set].sort((a, b) => a - b)
      }
      return out
    },
  },

  auth: {
    async session() {
      const u = me(getState())
      return u ? { user: u } : null
    },
    async requestCode() {
      await latency(400, 700)
      return { sent: true, demoCode: '1234' }
    },
    async verify(phone, code, name) {
      await latency(300, 600)
      if (code !== '1234') return { ok: false, error: 'code' }
      return mutate((d) => {
        let u = d.users.find((x) => normPhone(x.phone) === normPhone(phone))
        const isNew = !u
        if (!u) {
          u = { id: uid('u'), name: name?.trim() || 'Гость', phone, notif: { push: true, smsStatus: true, smsReminder: true } }
          d.users.push(u)
        }
        d.sessionUserId = u.id
        return { ok: true as const, session: { user: u }, isNew }
      })
    },
    async logout() {
      mutate((d) => {
        d.sessionUserId = null
      })
    },
    async updateMe(patch) {
      await latency()
      return mutate((d) => {
        const u = requireMe(d)
        Object.assign(u, patch)
        d.clients.forEach((c) => c.phone === DEMO_PHONE && u.id === 'u_me' && patch.phone && (c.phone = patch.phone))
        return u
      })
    },
  },

  bookings: {
    async mine() {
      await latency()
      demoTick()
      const s = getState()
      const u = me(s)
      if (!u) return []
      return s.bookings.filter((b) => b.userId === u.id && !b.unlinked).map((b) => view(s, b))
    },
    async get(id) {
      await latency(60, 150)
      demoTick()
      const s = getState()
      const b = s.bookings.find((x) => x.id === id)
      const u = me(s)
      return b && u && b.userId === u.id ? view(s, b) : null
    },
    async create(inp) {
      await latency(300, 600)
      const s = getState()
      const u = me(s)
      if (!u) return { ok: false, reason: 'auth' }
      const w = world()
      const dur = inp.serviceIds.reduce((a, id) => a + w.service(id).dur, 0)
      const free = freeSlots(w, inp.staffId, inp.date, dur, inp.replaceId)
      if (!free.includes(inp.start)) return { ok: false, reason: 'taken', alternatives: free.filter((m) => m > inp.start).slice(0, 4) }
      const sal = w.salon(inp.salonId)
      const auto = !sal.rules.manual
      return mutate((d) => {
        let c = d.clients.find((x) => x.salonId === inp.salonId && normPhone(x.phone) === normPhone(u.phone))
        if (!c) {
          c = { id: uid('c'), salonId: inp.salonId, name: `${u.name.split(' ')[0]} ${u.name.split(' ')[1]?.[0] ?? ''}`.trim(), phone: u.phone, source: inp.channel === 'direct' ? 'Ссылка салона' : 'Yeral', since: today() }
          d.clients.push(c)
        }
        const services = inp.serviceIds.map((id) => {
          const x = w.service(id)
          return { id: x.id, name: x.name, dur: x.dur, price: x.price }
        })
        const st = w.staff(inp.staffId)
        if (inp.replaceId) {
          const b = d.bookings.find((x) => x.id === inp.replaceId)!
          Object.assign(b, { date: inp.date, start: inp.start, staffId: inp.staffId, status: auto ? 'confirmed' : 'pending', rescheduled: true, proposal: undefined, createdAt: Date.now() })
          notify(d, { to: 'business', salonId: sal.id, title: 'Клиент просит перенести', body: `${c.name} · ${whenLabel(inp.date, inp.start)} · ${st.name}`, bookingId: b.id })
          return { ok: true as const, id: b.id, status: b.status as 'pending' | 'confirmed' }
        }
        const b: Booking = {
          id: uid('b'), salonId: inp.salonId, staffId: inp.staffId, clientId: c.id, userId: u.id, date: inp.date, start: inp.start,
          services, dur, price: services.reduce((a, x) => a + x.price, 0), status: auto ? 'confirmed' : 'pending', channel: inp.channel,
          comment: inp.comment || undefined, createdAt: Date.now(), confirmedAt: auto ? Date.now() : undefined,
        }
        d.bookings.push(b)
        notify(d, { to: 'business', salonId: sal.id, title: auto ? 'Новая запись' : 'Новая заявка', body: `${c.name} · ${whenLabel(b.date, b.start)} · ${svcSummary(b)} · ${st.name}`, bookingId: b.id })
        if (auto) notify(d, { to: 'client', title: `${sal.name}: запись подтверждена`, body: `${st.name} ждёт вас ${whenLabel(b.date, b.start)}.`, bookingId: b.id })
        return { ok: true as const, id: b.id, status: b.status as 'pending' | 'confirmed' }
      })
    },
    async cancel(id, reason) {
      await latency()
      mutate((d) => {
        const b = d.bookings.find((x) => x.id === id)!
        b.status = 'cancelled'
        b.cancelledBy = 'client'
        b.reason = reason
        b.late = minutesUntil(b.date, b.start) < catalog().salons.find((x) => x.id === b.salonId)!.rules.cancelHours * 60
        b.proposal = undefined
        notify(d, { to: 'business', salonId: b.salonId, title: b.late ? 'Поздняя отмена' : 'Клиент отменил', body: `${whenLabel(b.date, b.start)} · «${reason}»`, bookingId: b.id })
      })
    },
    async acceptProposal(id) {
      await latency()
      mutate((d) => {
        const b = d.bookings.find((x) => x.id === id)!
        if (!b.proposal) return
        Object.assign(b, { date: b.proposal.date, start: b.proposal.start, staffId: b.proposal.staffId, proposal: undefined, status: 'confirmed', confirmedAt: Date.now() })
        notify(d, { to: 'business', salonId: b.salonId, title: 'Клиент согласился на перенос', body: `Теперь ${whenLabel(b.date, b.start)}`, bookingId: b.id })
      })
    },
    async declineProposal(id) {
      await latency()
      mutate((d) => {
        const b = d.bookings.find((x) => x.id === id)!
        b.proposal = undefined
        notify(d, { to: 'business', salonId: b.salonId, title: 'Клиент оставил прежнее время', body: whenLabel(b.date, b.start), bookingId: b.id })
      })
    },
    async confirmAttendance(id) {
      await latency()
      mutate((d) => {
        const b = d.bookings.find((x) => x.id === id)!
        b.clientConfirmed = true
        notify(d, { to: 'business', salonId: b.salonId, title: 'Клиент подтвердил визит', body: whenLabel(b.date, b.start), bookingId: b.id })
      })
    },
    async notMe(id) {
      await latency()
      mutate((d) => {
        const b = d.bookings.find((x) => x.id === id)!
        b.unlinked = true
        notify(d, { to: 'business', salonId: b.salonId, title: 'Ошибка в номере?', body: `Клиент сообщил, что запись на ${whenLabel(b.date, b.start)} — не его. Проверьте номер.`, bookingId: b.id })
      })
    },
  },

  reviews: {
    async mine() {
      await latency()
      const s = getState()
      const u = me(s)
      if (!u) return []
      return s.reviews
        .filter((r) => r.userId === u.id)
        .map((r) => {
          const sal = catalog().salons.find((x) => x.id === r.salonId)!
          return { id: r.id, clientName: r.clientName, rating: r.rating, text: r.text, tags: r.tags, date: r.date, svc: r.svc, answer: r.answer, mine: true, salonName: sal.name, salonSlug: sal.slug, bookingId: r.bookingId, staffName: catalog().staff.find((x) => x.id === r.staffId)?.name }
        })
    },
    async create(bookingId, inp) {
      await latency()
      mutate((d) => {
        const u = requireMe(d)
        const b = d.bookings.find((x) => x.id === bookingId)!
        const id = uid('r')
        const rv: Review = { id, salonId: b.salonId, staffId: b.staffId, clientName: `${u.name.split(' ')[0]} ${u.name.split(' ')[1]?.[0] ?? ''}.`.replace(' .', ''), userId: u.id, bookingId, rating: inp.rating, text: inp.text, tags: inp.tags, date: today(), svc: svcSummary(b), createdAt: Date.now() }
        d.reviews.unshift(rv)
        b.reviewId = id
        notify(d, { to: 'business', salonId: b.salonId, title: inp.rating <= 3 ? `Отзыв на ${inp.rating} ★ — стоит ответить` : `Новый отзыв · ${inp.rating} ★`, body: `«${inp.text.slice(0, 80)}»` })
      })
    },
    async update(id, inp) {
      await latency()
      mutate((d) => {
        const r = d.reviews.find((x) => x.id === id)!
        r.rating = inp.rating
        r.text = inp.text
      })
    },
    async remove(id) {
      await latency()
      mutate((d) => {
        d.reviews = d.reviews.filter((x) => x.id !== id)
        d.bookings.forEach((b) => b.reviewId === id && (b.reviewId = undefined))
      })
    },
  },

  favorites: {
    async list() {
      const s = getState()
      const u = me(s)
      return u ? (s.favorites[u.id] ?? []) : []
    },
    async toggle(salonId) {
      return mutate((d) => {
        const u = requireMe(d)
        const a = d.favorites[u.id] ?? []
        const on = !a.includes(salonId)
        d.favorites[u.id] = on ? [...a, salonId] : a.filter((x) => x !== salonId)
        return on
      })
    },
  },

  notifications: {
    async list() {
      const s = getState()
      const u = me(s)
      if (!u) return []
      const mine = new Set(s.bookings.filter((b) => b.userId === u.id).map((b) => b.id))
      return s.notifs.filter((n) => n.to === 'client' && (!n.bookingId || mine.has(n.bookingId))).map(({ id, title, body, bookingId, ts, read }): NotificationView => ({ id, title, body, bookingId, ts, read }))
    },
    async markRead(id) {
      mutate((d) => {
        d.notifs.forEach((n) => n.to === 'client' && (!id || n.id === id) && (n.read = true))
      })
    },
  },
}

export { cancelDeadline, openState }
export type { ReviewPublic }

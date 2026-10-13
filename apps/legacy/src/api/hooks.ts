'use client'

/**
 * Data hooks for the UI. Components never call `api` directly — they use these,
 * so caching, loading states and invalidation are the same for the mock and the real backend.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './index'
import type { AvailabilityQuery, CreateBookingInput, SalonDetail, SearchParams } from './contract'

export const qk = {
  session: ['session'] as const,
  search: (p: SearchParams) => ['search', p] as const,
  salon: (slug: string) => ['salon', slug] as const,
  reviews: (salonId: string) => ['reviews', salonId] as const,
  similar: (salonId: string) => ['similar', salonId] as const,
  suggest: (q: string) => ['suggest', q] as const,
  nextFree: (salonId: string, staffId?: string) => ['nextFree', salonId, staffId ?? 'any'] as const,
  nextFreeMany: (ids: string[], date?: string) => ['nextFreeMany', ids.join(','), date ?? 'today'] as const,
  day: (q: AvailabilityQuery) => ['day', q] as const,
  days: (q: object) => ['days', q] as const,
  myBookings: ['myBookings'] as const,
  booking: (id: string) => ['booking', id] as const,
  myReviews: ['myReviews'] as const,
  favorites: ['favorites'] as const,
  notifications: ['notifications'] as const,
}

export const useSession = () => useQuery({ queryKey: qk.session, queryFn: () => api.auth.session(), staleTime: Infinity })

export const useSearch = (p: SearchParams) => useQuery({ queryKey: qk.search(p), queryFn: () => api.catalog.search(p), placeholderData: keepPreviousData })

export const useSalon = (slug: string, initialData?: SalonDetail | null) =>
  useQuery({ queryKey: qk.salon(slug), queryFn: () => api.catalog.salon(slug), initialData: initialData ?? undefined })

export const useReviews = (salonId: string) => useQuery({ queryKey: qk.reviews(salonId), queryFn: () => api.catalog.reviews(salonId) })

export const useSimilar = (salonId: string) => useQuery({ queryKey: qk.similar(salonId), queryFn: () => api.catalog.similar(salonId) })

export const useSuggest = (q: string) => useQuery({ queryKey: qk.suggest(q), queryFn: () => api.catalog.suggest(q), enabled: q.trim().length > 0, placeholderData: keepPreviousData })

export const useNextFree = (salonId: string, staffId?: string, enabled = true) =>
  useQuery({ queryKey: qk.nextFree(salonId, staffId), queryFn: () => api.availability.nextFree(salonId, staffId), enabled })

export const useNextFreeMany = (ids: string[], date?: string, enabled = true) =>
  useQuery({ queryKey: qk.nextFreeMany(ids, date), queryFn: () => api.availability.nextFreeMany(ids, date), enabled: enabled && ids.length > 0, placeholderData: keepPreviousData })

export const useDay = (q: AvailabilityQuery | null) =>
  useQuery({ queryKey: qk.day(q ?? ({} as AvailabilityQuery)), queryFn: () => api.availability.day(q!), enabled: !!q && q.serviceIds.length > 0, placeholderData: keepPreviousData })

export const useDays = (q: (Omit<AvailabilityQuery, 'date'> & { from: string; days: number }) | null) =>
  useQuery({ queryKey: qk.days(q ?? {}), queryFn: () => api.availability.days(q!), enabled: !!q && q.serviceIds.length > 0, placeholderData: keepPreviousData })

export const useMyBookings = (enabled = true) => useQuery({ queryKey: qk.myBookings, queryFn: () => api.bookings.mine(), enabled })

export const useBooking = (id: string) =>
  useQuery({
    queryKey: qk.booking(id),
    queryFn: () => api.bookings.get(id),
    // while the salon hasn't answered, look for the answer
    refetchInterval: (q) => (q.state.data?.status === 'pending' ? 2500 : false),
  })

export const useMyReviews = (enabled = true) => useQuery({ queryKey: qk.myReviews, queryFn: () => api.reviews.mine(), enabled })

export const useFavorites = (enabled = true) => useQuery({ queryKey: qk.favorites, queryFn: () => api.favorites.list(), enabled })

export const useNotifications = (enabled = true) => useQuery({ queryKey: qk.notifications, queryFn: () => api.notifications.list(), enabled, refetchInterval: enabled ? 5000 : false })

/** Mutations invalidate everything account-related: cheap with the mock, explicit enough for the real API. */
function useInvalidateAccount() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ predicate: (q) => !['salon', 'search', 'suggest', 'similar'].includes(String(q.queryKey[0])) })
}

export function useToggleFavorite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (salonId: string) => api.favorites.toggle(salonId),
    onMutate: async (salonId) => {
      await qc.cancelQueries({ queryKey: qk.favorites })
      const prev = qc.getQueryData<string[]>(qk.favorites) ?? []
      qc.setQueryData<string[]>(qk.favorites, prev.includes(salonId) ? prev.filter((x) => x !== salonId) : [...prev, salonId])
      return { prev }
    },
    onError: (_e, _v, ctx) => ctx && qc.setQueryData(qk.favorites, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.favorites }),
  })
}

export function useCreateBooking() {
  const inv = useInvalidateAccount()
  return useMutation({ mutationFn: (inp: CreateBookingInput) => api.bookings.create(inp), onSuccess: inv })
}

export function useBookingAction() {
  const inv = useInvalidateAccount()
  return useMutation({
    mutationFn: async (a: { kind: 'cancel'; id: string; reason: string } | { kind: 'accept' | 'decline' | 'attend' | 'notMe'; id: string }) => {
      if (a.kind === 'cancel') return api.bookings.cancel(a.id, a.reason)
      if (a.kind === 'accept') return api.bookings.acceptProposal(a.id)
      if (a.kind === 'decline') return api.bookings.declineProposal(a.id)
      if (a.kind === 'attend') return api.bookings.confirmAttendance(a.id)
      return api.bookings.notMe(a.id)
    },
    onSuccess: inv,
  })
}

export function useReviewAction() {
  const qc = useQueryClient()
  const inv = useInvalidateAccount()
  return useMutation({
    mutationFn: async (a: { kind: 'create'; bookingId: string; rating: number; text: string; tags: string[] } | { kind: 'update'; id: string; rating: number; text: string } | { kind: 'remove'; id: string }) => {
      if (a.kind === 'create') return api.reviews.create(a.bookingId, a)
      if (a.kind === 'update') return api.reviews.update(a.id, a)
      return api.reviews.remove(a.id)
    },
    onSuccess: () => {
      inv()
      qc.invalidateQueries({ queryKey: ['reviews'] })
      qc.invalidateQueries({ queryKey: ['salon'] })
    },
  })
}

export function useAuthActions() {
  const qc = useQueryClient()
  const reset = () => qc.invalidateQueries()
  return {
    requestCode: (phone: string) => api.auth.requestCode(phone),
    verify: async (phone: string, code: string, name?: string) => {
      const r = await api.auth.verify(phone, code, name)
      if (r.ok) {
        qc.setQueryData(qk.session, r.session)
        await reset()
      }
      return r
    },
    logout: async () => {
      await api.auth.logout()
      qc.setQueryData(qk.session, null)
      qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'session' && q.queryKey[0] !== 'salon' && q.queryKey[0] !== 'search' })
    },
    updateMe: async (patch: Parameters<typeof api.auth.updateMe>[0]) => {
      const u = await api.auth.updateMe(patch)
      qc.setQueryData(qk.session, { user: u })
      return u
    },
  }
}

export function useMarkRead() {
  const qc = useQueryClient()
  return (id?: string) => api.notifications.markRead(id).then(() => qc.invalidateQueries({ queryKey: qk.notifications }))
}

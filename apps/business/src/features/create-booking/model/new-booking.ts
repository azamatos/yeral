import type { Menu } from '@yeral/contract/services'
import type { Price } from '@yeral/domain/model'
import { localOf, QUARTER_HOUR } from '@yeral/domain/time'

export type MenuService = Menu['groups'][number]['services'][number]
export type Person = { staffId: string; name: string; photo?: { url: string } | null }
export type TeamSource = 'phone' | 'walkin'

/** What the drawer opens with: the day on screen, and what a free slot, «Book again» or the client's card fill in. */
export type NewBookingStart = {
  date: string
  staffId?: string
  start?: number
  clientId?: string
  serviceIds?: readonly string[]
}

/** The services picked, in the order they were picked: the order they run in. */
export const servicesOf = (menu: Menu | undefined, ids: readonly string[]): MenuService[] => {
  const all = menu?.groups.flatMap((g) => g.services) ?? []
  return ids.flatMap((id) => all.find((s) => s.id === id) ?? [])
}

/**
 * The phone sheet's chips (book B-24 step 3): this client's usual services first, then the menu's (the given person's
 * only), up to four; a service picked from the full list stays among them.
 */
export function quickServices(
  menu: Menu | undefined,
  usual: readonly string[],
  picked: readonly string[],
  staffId: string | null,
): MenuService[] {
  const all = menu?.groups.flatMap((g) => g.services) ?? []
  const fits = all.filter((s) => !staffId || s.staffIds.includes(staffId))
  const first = [...servicesOf(menu, usual), ...fits].filter((s, i, list) => list.indexOf(s) === i).slice(0, 4)
  return [...first, ...servicesOf(menu, picked).filter((s) => !first.includes(s))]
}

/** Who does all the services picked: one specialist does a booking (book B-23 step 5). */
export const eligibleFor = <P extends Person>(people: readonly P[], services: readonly MenuService[]): P[] =>
  people.filter((p) => services.every((s) => s.staffIds.includes(p.staffId)))

/** Whose booking it is: the one picked while they do it all, otherwise the only one who does. */
export function staffOf(picked: string | null, people: readonly Person[], services: readonly MenuService[]): string | null {
  if (services.length === 0) return picked
  const can = eligibleFor(people, services)
  if (picked && can.some((p) => p.staffId === picked)) return picked
  return can.length === 1 ? can[0]!.staffId : null
}

/** How long and how much: a «from» price or a hidden one makes the sum a «from», all free stays free. */
export function totalOf(services: readonly MenuService[]): { minutes: number; price: Price } {
  const minutes = services.reduce((sum, s) => sum + s.durationMin, 0)
  const amount = services.reduce((sum, s) => sum + (s.priceType === 'free' ? 0 : s.priceAmount), 0)
  const open = services.some((s) => s.priceType === 'from' || s.priceType === 'hidden')
  return { minutes, price: { type: open ? 'from' : amount === 0 ? 'free' : 'fixed', amount } }
}

/** The quarter that holds now: a walk-in can't start before it (book B-25, §26 E3). */
export const currentStep = (now: number): number => Math.floor(localOf(now).min / QUARTER_HOUR) * QUARTER_HOUR

/** The day's starts by part of the day, as the board groups them. */
export const PARTS = [
  { key: 'morning', from: 0, to: 720 },
  { key: 'afternoon', from: 720, to: 1020 },
  { key: 'evening', from: 1020, to: Infinity },
] as const

/** What still stands between the form and «Save booking», in the board's order. */
export const MISSING = ['client', 'service', 'specialist', 'time'] as const
export type Missing = (typeof MISSING)[number]

export function missingOf(f: { hasClient: boolean; services: number; staffId: string | null; timeOk: boolean }): Missing[] {
  return [
    ...(f.hasClient ? [] : (['client'] as const)),
    ...(f.services > 0 ? [] : (['service'] as const)),
    ...(!f.staffId && f.services > 0 ? (['specialist'] as const) : []),
    ...(f.timeOk ? [] : (['time'] as const)),
  ]
}

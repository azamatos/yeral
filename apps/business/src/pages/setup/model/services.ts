import type { Category } from '@yeral/contract/catalog'
import type { Menu } from '@yeral/contract/services'
import type { SetupServices } from '@yeral/contract/setup'
import { localized, type Locale, type Localized, type PriceType } from '@yeral/domain/model'
import { PRICE_MAX, serviceErrors } from '@yeral/domain/services'
import { writtenIn } from '@/shared/lib'

/** The step's durations (B-Onboarding step 5): 15 minutes to 4 hours. */
export const DURATION_CHOICES = [15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 240] as const

/** The name field's limit (B-Onboarding cuts at 60; the menu takes up to 80). */
export const SERVICE_NAME_MAX = 60

/** The price field's digits (up to the menu's 99 999). */
export const PRICE_DIGITS = String(PRICE_MAX).length

/** The group the owner's own services go to («New services» until they name it). */
export const OWN_GROUP = 'own'

export type ServiceGroupRow = {
  key: string
  /** A group of the menu saved before: it stays itself (`PUT …/setup/services` keeps it by id). */
  id?: string
  /** A starter group of the draft's category: the api writes its name in every language. */
  starter?: string
  name: string
  /** The name it came with: a change is the owner's own wording. */
  original: string
  /** Every language of a group saved before (the menu's). */
  written?: Localized
}

/** One service row of the step, as typed. */
export type ServiceRow = {
  key: string
  /** Its group's key. */
  group: string
  /** A service of the menu saved before: it keeps what the step doesn't show (a description, who does it). */
  id?: string
  /** A starter's id: the api keeps its name in every language while the owner leaves it as it was. */
  starter?: string
  /** Every language of a service saved before (the menu's). */
  written?: Localized
  name: string
  /** The name it came with: a change is the owner's own wording. */
  original: string
  durationMin: number
  priceType: PriceType
  /** Digits as typed. */
  price: string
  on: boolean
}

export type ServicesForm = { groups: ServiceGroupRow[]; rows: ServiceRow[]; next: number }

/** The category's starter list, every row picked at first (B-Onboarding `starter(cat)`). */
export function formFromStarters(groups: Category['starterGroups']): ServicesForm {
  return {
    groups: groups.map((g) => ({ key: `starter:${g.id}`, starter: g.id, name: g.name, original: g.name })),
    rows: groups.flatMap((g) =>
      g.services.map((s) => ({
        key: `starter:${s.id}`,
        group: `starter:${g.id}`,
        starter: s.id,
        name: s.name,
        original: s.name,
        durationMin: s.durationMin,
        priceType: s.price.type,
        price: String(s.price.amount),
        on: true,
      })),
    ),
    next: 0,
  }
}

/**
 * The menu saved before (back at the step, or a menu made in Settings), every row picked; the step's own group takes
 * the services added now: `ownId` right after a save (whatever the owner named it), otherwise the first group named
 * `ownName` («New services»).
 */
export function formFromMenu(menu: Menu, locale: Locale, ownName: string, ownId?: string): ServicesForm {
  const own = ownId ?? menu.groups.find((g) => localized(g.name, locale) === ownName)?.id
  const keyOf = (groupId: string) => (groupId === own ? OWN_GROUP : `menu:${groupId}`)
  return {
    groups: menu.groups.map((g) => {
      const name = localized(g.name, locale)
      return { key: keyOf(g.id), id: g.id, name, original: name, written: g.name }
    }),
    rows: menu.groups.flatMap((g) =>
      g.services.map((s) => {
        const name = localized(s.name, locale)
        return {
          key: `menu:${s.id}`,
          group: keyOf(g.id),
          id: s.id,
          written: s.name,
          name,
          original: name,
          durationMin: s.durationMin,
          priceType: s.priceType,
          price: String(s.priceAmount),
          on: true,
        }
      }),
    ),
    next: 0,
  }
}

/**
 * Another category's starter list (picked again at the business step) in place of the one shown: the owner's own new
 * rows stay (B-Onboarding `pick`).
 */
export function withStarters(form: ServicesForm, groups: Category['starterGroups']): ServicesForm {
  const fresh = formFromStarters(groups)
  const own = form.rows.filter((r) => r.group === OWN_GROUP && !r.id)
  if (!own.length) return fresh
  return {
    groups: [...fresh.groups, form.groups.find((g) => g.key === OWN_GROUP)!],
    rows: [...fresh.rows, ...own],
    next: form.next,
  }
}

/**
 * The own group's id in the menu a save gave back: the groups come back in the order they were sent (only those with
 * a picked row), so its place among them finds it, whatever name it has.
 */
export function savedOwnGroupId(form: ServicesForm, menu: Menu): string | undefined {
  const sent = form.groups.filter((g) => form.rows.some((r) => r.group === g.key && r.on))
  const at = sent.findIndex((g) => g.key === OWN_GROUP)
  return at >= 0 && sent.length === menu.groups.length ? menu.groups[at]?.id : undefined
}

/** «Add service»: a blank row in «New services», picked, an hour long (B-Onboarding `addSvc`). */
export function withNewRow(form: ServicesForm, ownName: string): ServicesForm {
  const groups = form.groups.some((g) => g.key === OWN_GROUP)
    ? form.groups
    : [...form.groups, { key: OWN_GROUP, name: ownName, original: ownName }]
  const row: ServiceRow = {
    key: `new:${form.next}`,
    group: OWN_GROUP,
    name: '',
    original: '',
    durationMin: 60,
    priceType: 'fixed',
    price: '',
    on: true,
  }
  return { groups, rows: [...form.rows, row], next: form.next + 1 }
}

const amountOf = (r: ServiceRow) => (r.price === '' ? Number.NaN : Number(r.price))

/** A price the step can't set: free or hidden (Settings sets them); the step shows it as it is. */
export const fixedPrice = (r: Pick<ServiceRow, 'priceType'>) => r.priceType === 'fixed' || r.priceType === 'from'

const priceOk = (r: ServiceRow) =>
  !serviceErrors({ durationMin: r.durationMin, priceType: r.priceType, priceAmount: amountOf(r), bufferMin: null }).priceAmount

/**
 * What holds Continue, in this order: no row picked; a new row of the owner's without a name («Name the new
 * service.»), another row without one; a group with a picked row but no name; then a price the menu doesn't take.
 */
export function servicesProblem(form: ServicesForm): 'none' | 'newName' | 'name' | 'groupName' | 'price' | null {
  const picked = form.rows.filter((r) => r.on)
  if (!picked.length) return 'none'
  const nameless = picked.filter((r) => !r.name.trim())
  if (nameless.some((r) => !r.id && !r.starter)) return 'newName'
  if (nameless.length) return 'name'
  if (form.groups.some((g) => !g.name.trim() && picked.some((r) => r.group === g.key))) return 'groupName'
  return picked.every(priceOk) ? null : 'price'
}

/**
 * The step's menu for `PUT …/setup/services`: the picked rows in their groups, in the step's order; what was saved
 * before by its id. A name, a group's as a service's, goes only when the owner changed it (or for a new one of their
 * own): a starter's in the language they wrote it in, a saved one's over that language only.
 */
export function servicesInput(form: ServicesForm, locale: Locale): SetupServices {
  const groups = form.groups.flatMap((g) => {
    const rows = form.rows.filter((r) => r.group === g.key && r.on)
    if (!rows.length) return []
    const groupName = g.name.trim()
    const renamed = groupName !== g.original
    const group = g.id
      ? { id: g.id, ...(renamed && { name: writtenIn(g.written, locale, groupName) }) }
      : g.starter
        ? { starter: g.starter, ...(renamed && { name: { [locale]: groupName } }) }
        : { name: { [locale]: groupName } }
    const services = rows.map((r) => {
      const name = r.name.trim()
      const changed = name !== r.original
      // a new row of the owner's own always has its name; a starter's or a saved one's only when changed
      // a saved one's in the market's languages only (the menu may hold the catalogue's others)
      const written = !changed && (r.id || r.starter) ? undefined : r.id ? writtenIn(r.written, locale, name) : { [locale]: name }
      return {
        ...(r.id ? { id: r.id } : r.starter && { starter: r.starter }),
        ...(written && { name: written }),
        durationMin: r.durationMin,
        priceType: r.priceType,
        priceAmount: amountOf(r),
      }
    })
    return [{ ...group, services }]
  })
  return { groups }
}

/** The step list's summary and the count above the rows. */
export const pickedCount = (form: ServicesForm) => form.rows.filter((r) => r.on).length

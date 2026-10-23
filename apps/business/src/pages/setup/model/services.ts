import type { Category } from '@yeral/contract/catalog'
import type { Menu } from '@yeral/contract/services'
import type { SetupServices } from '@yeral/contract/setup'
import { localized, type Locale, type Localized, type PriceType } from '@yeral/domain/model'
import { serviceErrors } from '@yeral/domain/services'

/** The step's durations (B-Onboarding step 5): 15 minutes to 4 hours. */
export const DURATION_CHOICES = [15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 240] as const

/** The name field's limit (B-Onboarding cuts at 60; the menu takes up to 80). */
export const SERVICE_NAME_MAX = 60

/** The group the owner's own services go to («New services»). */
export const OWN_GROUP = 'own'

export type ServiceGroupRow = {
  key: string
  /** A group of the menu saved before: it stays itself (`PUT …/setup/services` keeps it by id). */
  id?: string
  /** A starter group of the draft's category: the api writes its name in every language. */
  starter?: string
  name: string
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
    groups: groups.map((g) => ({ key: `starter:${g.id}`, starter: g.id, name: g.name })),
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
 * The menu saved before (back at the step, or a menu made in Settings), every row picked; the group named like the
 * step's own («New services») takes the services added now.
 */
export function formFromMenu(menu: Menu, locale: Locale, ownName: string): ServicesForm {
  return {
    groups: menu.groups.map((g) => {
      const name = localized(g.name, locale)
      return { key: name === ownName ? OWN_GROUP : `menu:${g.id}`, id: g.id, name, written: g.name }
    }),
    rows: menu.groups.flatMap((g) =>
      g.services.map((s) => {
        const name = localized(s.name, locale)
        return {
          key: `menu:${s.id}`,
          group: localized(g.name, locale) === ownName ? OWN_GROUP : `menu:${g.id}`,
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

/** «Add service»: a blank row in «New services», picked, an hour long (B-Onboarding `addSvc`). */
export function withNewRow(form: ServicesForm, ownName: string): ServicesForm {
  const groups = form.groups.some((g) => g.key === OWN_GROUP) ? form.groups : [...form.groups, { key: OWN_GROUP, name: ownName }]
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

/** Why a picked row can't be saved yet, if it can't: it needs a name, then a price the menu takes. */
export function rowProblem(r: ServiceRow): 'name' | 'price' | null {
  if (!r.on) return null
  if (!r.name.trim()) return 'name'
  const errors = serviceErrors({ durationMin: r.durationMin, priceType: r.priceType, priceAmount: amountOf(r), bufferMin: null })
  return errors.priceAmount || errors.durationMin ? 'price' : null
}

/** What holds Continue: no row picked, then the first picked row's problem. */
export function servicesProblem(form: ServicesForm): 'none' | 'name' | 'price' | null {
  const picked = form.rows.filter((r) => r.on)
  if (!picked.length) return 'none'
  for (const r of picked) {
    const problem = rowProblem(r)
    if (problem) return problem
  }
  return null
}

/**
 * The step's menu for `PUT …/setup/services`: the picked rows in their groups, in the step's order; what was saved
 * before by its id. A name goes only when the owner changed it (or for a new row of their own): a starter's in the
 * language they wrote it in, a saved row's over that language only.
 */
export function servicesInput(form: ServicesForm, locale: Locale): SetupServices {
  const groups = form.groups.flatMap((g) => {
    const rows = form.rows.filter((r) => r.group === g.key && r.on)
    if (!rows.length) return []
    const group = g.id ? { id: g.id } : g.starter ? { starter: g.starter } : { name: { [locale]: g.name.trim() } }
    const services = rows.map((r) => {
      const name = r.name.trim()
      const changed = name !== r.original
      // a new row of the owner's own always has its name; a starter's or a saved one's only when changed
      const written = !changed && (r.id || r.starter) ? undefined : r.id ? { ...r.written, [locale]: name } : { [locale]: name }
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

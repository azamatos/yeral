import type { BusinessDetail } from '@yeral/contract/catalog'
import { priceTotal } from '@yeral/domain/pricing'
import type { Price } from '@yeral/domain/model'

type Service = BusinessDetail['serviceGroups'][number]['services'][number]

/**
 * The services a visitor picked on the business page (Venue «Saýla», book C-06), kept in the address as
 * `?services=id,id` so a shared link and the booking flow see the same choice. Ids the page no longer has (a service
 * removed meanwhile) are dropped; the order is the order they were picked in, as the summary card lists them.
 */
export function parseServiceIds(raw: string | undefined): string[] {
  if (!raw) return []
  return [...new Set(raw.split(',').map((id) => id.trim()))].filter(Boolean)
}

/** The most services one booking takes (the api's `serviceIds` and free-times lists, `max(10)`). */
export const SERVICES_MAX = 10

/** The address's value for these ids; none means no `?services=` at all. */
export function serviceIdsParam(ids: readonly string[]): string | undefined {
  return ids.length > 0 ? ids.join(',') : undefined
}

/** Picks the service, or lets it go when it was picked. */
export function toggleService(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
}

/** The picked services the page has, in the order they were picked. */
export function pickedServices(detail: Pick<BusinessDetail, 'serviceGroups'>, ids: readonly string[]): Service[] {
  const byId = new Map(detail.serviceGroups.flatMap((g) => g.services).map((s) => [s.id, s]))
  return ids.flatMap((id) => byId.get(id) ?? [])
}

/**
 * The summary card's total (Venue `selection`): the minutes back to back and one price, «from» when any service is
 * priced «from» or keeps its price for the place, and «Price at the place» when only such services are picked
 * (`priceTotal`, book B-37).
 */
export function selectionTotal(services: readonly Service[]): { minutes: number; price: Price } {
  return {
    minutes: services.reduce((sum, s) => sum + s.durationMin, 0),
    price: priceTotal(services.map((s) => s.price)),
  }
}

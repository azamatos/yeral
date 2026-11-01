import { ADMIN_BUSINESS_VIEWS, type AdminBusinessView } from '@yeral/contract/admin'

/** The list's address: the view (the queue without one) and the search, so a list can be shared and reloaded. */
export function businessesSearch(search: Record<string, unknown>): { view?: AdminBusinessView; q?: string } {
  const view = ADMIN_BUSINESS_VIEWS.find((v) => v === search.view)
  return {
    ...(view && view !== 'review' ? { view } : {}),
    ...(typeof search.q === 'string' && search.q ? { q: search.q } : {}),
  }
}

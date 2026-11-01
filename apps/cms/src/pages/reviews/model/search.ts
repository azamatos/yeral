import { ADMIN_REVIEW_VIEWS } from '@yeral/contract/admin'

type View = (typeof ADMIN_REVIEW_VIEWS)[number]

/** The list's address: the view, the waiting reviews without one. */
export function reviewsSearch(search: Record<string, unknown>): { view?: View } {
  const view = ADMIN_REVIEW_VIEWS.find((v) => v === search.view)
  return view && view !== 'reported' ? { view } : {}
}

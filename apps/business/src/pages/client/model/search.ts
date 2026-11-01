/** The client card's address (B-Client, book B-34): how much history shows, the delete modal (the list's menu opens it). */
export type ClientSearch = { history?: number; remove?: true }

/** The history's first page and each «Show more», and the most the api gives. */
export const HISTORY_STEP = 10
export const HISTORY_MAX = 200

/** What's not a longer history leaves the first page. */
export function clientSearch(search: Record<string, unknown>): ClientSearch {
  const history = search.history
  const longer = typeof history === 'number' && Number.isInteger(history) && history > HISTORY_STEP && history <= HISTORY_MAX
  return {
    ...(longer ? { history } : {}),
    ...(search.remove === true ? { remove: true as const } : {}),
  }
}

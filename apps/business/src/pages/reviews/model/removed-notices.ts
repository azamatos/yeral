import type { RemovedReview } from '@yeral/contract/reviews'
import { useState } from 'react'

/** Where this browser keeps the notices the reader closed (their ids), per workspace. */
export const removedNoticesKey = (slug: string) => `yeral.reviews.removed.${slug}`

/** The ids kept under the key, or none when there's nothing readable there. */
export function closedIds(raw: string | null): string[] {
  try {
    const parsed: unknown = JSON.parse(raw ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

/** The closed ids worth keeping: `id` and those the api still sends (the rest are past their 30 days). */
export const keepClosed = (closed: readonly string[], removed: readonly RemovedReview[], id: string): string[] => [
  ...closed.filter((c) => c !== id && removed.some((r) => r.id === c)),
  id,
]

const storage = () => {
  try {
    return globalThis.localStorage
  } catch {
    // storage refused (a private window, blocked site data): a closed notice comes back next time
    return null
  }
}

/**
 * «Ýeral removed a review you reported» (B-Reviews) stays until the reader closes it, and the api says it for 30 days
 * (`REVIEW_REMOVED_NOTICE_DAYS`): this browser remembers which notices were closed, so they don't come back on the
 * next visit. Another browser shows them again until closed there too: no "seen" state on the server for a notice.
 */
export function useRemovedNotices(slug: string, removed: readonly RemovedReview[]) {
  const key = removedNoticesKey(slug)
  const [closed, setClosed] = useState(() => closedIds(storage()?.getItem(key) ?? null))
  const close = (id: string) => {
    const next = keepClosed(closed, removed, id)
    setClosed(next)
    storage()?.setItem(key, JSON.stringify(next))
  }
  return { open: removed.filter((r) => !closed.includes(r.id)), close }
}

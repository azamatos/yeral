import type { BookingDetail } from '@yeral/contract/bookings'
import { REVIEW_TAGS, REVIEW_TAGS_MAX, REVIEW_TEXT_MAX, type ReviewTag } from '@yeral/domain/lifecycle'

/** A review as the booking carries it: the stars, the tags, the words and when it was written. */
export type WrittenReview = NonNullable<BookingDetail['review']>

/** What the form holds: stars (none yet), the tags (the quick ones by key; any others kept as they came), the words. */
export interface ReviewForm {
  rating: number | null
  tags: string[]
  text: string
}

/**
 * The form as it opens: the review being changed (book C-35), or a new one, with the stars the «How was it?» card was
 * pressed on already picked (F-243).
 */
export function initialForm(written: WrittenReview | null, rating: number | null = null): ReviewForm {
  if (written) return { rating: written.rating, tags: [...written.tags], text: written.text ?? '' }
  return { rating, tags: [], text: '' }
}

/**
 * A quick tag on or off; the quick ones keep the form's order, any other kept where it was. A review holds
 * `REVIEW_TAGS_MAX` at most (a written one may carry others): one more past it isn't added.
 */
export function toggleTag(tags: readonly string[], tag: ReviewTag): string[] {
  if (tags.includes(tag)) return tags.filter((t) => t !== tag)
  if (tags.length >= REVIEW_TAGS_MAX) return [...tags]
  const others = tags.filter((t) => !(REVIEW_TAGS as readonly string[]).includes(t))
  return [...REVIEW_TAGS.filter((t) => t === tag || tags.includes(t)), ...others]
}

/** The words over the limit (the api trims them first, so only what's left counts). */
export const tooLong = (form: ReviewForm) => form.text.trim().length > REVIEW_TEXT_MAX

/** What's sent: the stars, the tags, the words trimmed (left out when there are none); null while it can't go. */
export function reviewBody(form: ReviewForm): { rating: number; tags: string[]; text?: string } | null {
  if (form.rating === null || tooLong(form)) return null
  const text = form.text.trim()
  return { rating: form.rating, tags: form.tags, ...(text ? { text } : {}) }
}

/** Whether a change of a written review changes anything (its Save waits until it does). */
export function changed(form: ReviewForm, written: WrittenReview): boolean {
  const same = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every((t) => b.includes(t))
  return form.rating !== written.rating || !same(form.tags, written.tags) || form.text.trim() !== (written.text ?? '')
}

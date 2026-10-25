import { describe, expect, it } from 'vitest'
import { changed, editableUntil, initialForm, reviewBody, toggleTag, tooLong, type WrittenReview } from './review-form'

const written: WrittenReview = { rating: 4, tags: ['clean', 'Old words'], text: 'Good haircut.', createdAt: Date.UTC(2026, 9, 20) }

describe('the review form', () => {
  it('opens empty, with the card’s stars, or with the review being changed', () => {
    expect(initialForm(null)).toEqual({ rating: null, tags: [], text: '' })
    expect(initialForm(null, 4)).toEqual({ rating: 4, tags: [], text: '' })
    expect(initialForm(written)).toEqual({ rating: 4, tags: ['clean', 'Old words'], text: 'Good haircut.' })
  })

  it('keeps the quick tags in the form’s order and any other where it was', () => {
    expect(toggleTag([], 'friendly')).toEqual(['friendly'])
    expect(toggleTag(['friendly'], 'on_time')).toEqual(['on_time', 'friendly'])
    expect(toggleTag(['friendly', 'on_time'], 'friendly')).toEqual(['on_time'])
    expect(toggleTag(['Old words'], 'clean')).toEqual(['clean', 'Old words'])
  })

  it('sends the stars, the tags and the words trimmed, none when empty; nothing without stars or over 500', () => {
    expect(reviewBody({ rating: null, tags: [], text: '' })).toBeNull()
    expect(reviewBody({ rating: 5, tags: ['clean'], text: '  ' })).toEqual({ rating: 5, tags: ['clean'] })
    expect(reviewBody({ rating: 5, tags: [], text: ' Thanks! ' })).toEqual({ rating: 5, tags: [], text: 'Thanks!' })
    const long = { rating: 5, tags: [], text: `${'a'.repeat(500)}   ` }
    expect(tooLong(long)).toBe(false)
    expect(reviewBody({ ...long, text: 'a'.repeat(501) })).toBeNull()
  })

  it('knows when a change changes something', () => {
    expect(changed(initialForm(written), written)).toBe(false)
    expect(changed({ ...initialForm(written), text: 'Good haircut. ' }, written)).toBe(false)
    expect(changed({ ...initialForm(written), tags: ['Old words', 'clean'] }, written)).toBe(false)
    expect(changed({ ...initialForm(written), rating: 5 }, written)).toBe(true)
    expect(changed({ ...initialForm(written), tags: ['clean'] }, written)).toBe(true)
  })

  it('can be changed for 7 days', () => {
    expect(editableUntil(written)).toBe(Date.UTC(2026, 9, 27))
  })
})

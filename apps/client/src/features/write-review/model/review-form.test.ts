import { ApiError } from '@yeral/sdk'
import { describe, expect, it } from 'vitest'
import { changed, initialForm, refused, reviewBody, toggleTag, tooLong, type WrittenReview } from './review-form'

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

  it('holds 6 tags at most: a written review’s others count too', () => {
    const six = ['on_time', 'clean', 'skilled', 'friendly', 'A', 'B']
    expect(toggleTag(six, 'good_value')).toEqual(six)
    expect(toggleTag(six, 'clean')).toEqual(['on_time', 'skilled', 'friendly', 'A', 'B'])
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

  it('tells the api’s refusal (the booking moved on) from a failure the form may retry', () => {
    expect(refused(new ApiError(409, 'review_exists'))).toBe(true)
    expect(refused(new ApiError(403, 'review_window_passed'))).toBe(true)
    expect(refused(new ApiError(404, 'not_found'))).toBe(true)
    expect(refused(new ApiError(500, 'internal'))).toBe(false)
    expect(refused(new ApiError(0, 'network'))).toBe(false)
    expect(refused(new TypeError('offline'))).toBe(false)
  })
})

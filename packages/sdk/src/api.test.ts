import { ApiError } from './client'
import { describe, expect, it } from 'vitest'
import { shouldRetry } from './api'

describe('shouldRetry', () => {
  it.each([
    [401, 'unauthorized'],
    [404, 'not_found'],
    [429, 'rate_limited'],
  ] as const)('never asks again after a %i: the answer would be the same', (status, code) => {
    expect(shouldRetry(0, new ApiError(status, code))).toBe(false)
  })

  it('tries twice more after a lost connection or a server error', () => {
    for (const error of [new ApiError(0, 'network'), new ApiError(500, 'internal'), new Error('boom')]) {
      expect(shouldRetry(0, error)).toBe(true)
      expect(shouldRetry(1, error)).toBe(true)
      expect(shouldRetry(2, error)).toBe(false)
    }
  })
})

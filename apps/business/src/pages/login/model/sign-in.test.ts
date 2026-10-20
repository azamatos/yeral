import { ApiError } from '@yeral/sdk'
import { describe, expect, it } from 'vitest'
import { initialSignIn, signInReducer, signInView, type SignInEvent, type SignInState } from './sign-in'

const T = 1_000_000
const run = (...events: SignInEvent[]) => events.reduce(signInReducer, initialSignIn)
const typed = (phone = '65102030') => run({ type: 'phoneChanged', phone })
const atCode = (now = T) => signInReducer(typed(), { type: 'codeSent', resendAfterSec: 59, now })

describe('the phone step', () => {
  it('keeps the error until the number changes', () => {
    const s = signInReducer(typed('651020'), { type: 'phoneInvalid', error: 'incomplete' })
    expect(s.phoneError).toBe('incomplete')
    expect(signInReducer(s, { type: 'phoneChanged', phone: '6510203' }).phoneError).toBeUndefined()
  })

  it('moves to the code step when the code is sent, with the resend timer from the api', () => {
    const s = atCode()
    expect(s).toMatchObject({ step: 'code', sentTo: '65102030', code: '', resent: false })
    expect(signInView(s, T).resendInSec).toBe(59)
    expect(signInView(s, T + 17_000).resendInSec).toBe(42)
    expect(signInView(s, T + 60_000).resendInSec).toBe(0)
  })

  it('shows the code only when the api hands it out', () => {
    expect(atCode().shownCode).toBeUndefined()
    expect(signInReducer(typed(), { type: 'codeSent', resendAfterSec: 59, code: '4821', now: T }).shownCode).toBe('4821')
  })

  it('stops at too many codes for this number, counted in minutes, and lets another number try', () => {
    const s = signInReducer(typed(), { type: 'sendRefused', error: new ApiError(429, 'rate_limited', { retryAfterSec: 2520 }), now: T })
    expect(s.step).toBe('phone')
    expect(signInView(s, T).tooManyCodesMin).toBe(42)
    expect(signInView(s, T + 60_000).tooManyCodesMin).toBe(41)
    expect(signInView(signInReducer(s, { type: 'phoneChanged', phone: '65102031' }), T).tooManyCodesMin).toBe(0)
    // the wait ends
    expect(signInReducer(s, { type: 'tick', now: T + 2_520_000 }).limit).toBeUndefined()
  })

  it('goes back to a code sent less than a minute ago instead of failing', () => {
    const s = signInReducer(typed(), { type: 'sendRefused', error: new ApiError(429, 'resend_too_soon', { retryAfterSec: 31 }), now: T })
    expect(s.step).toBe('code')
    expect(signInView(s, T).resendInSec).toBe(31)
  })

  it('opens a locked number on the code step with the lock running', () => {
    const s = signInReducer(typed(), { type: 'sendRefused', error: new ApiError(429, 'too_many_attempts', { retryAfterSec: 40 }), now: T })
    expect(s.step).toBe('code')
    expect(signInView(s, T)).toMatchObject({ locked: true, lockLeftSec: 40 })
  })

  it('takes a refusal of the number as «not a mobile number»', () => {
    const s = signInReducer(typed('12456789'), { type: 'sendRefused', error: new ApiError(400, 'validation_error'), now: T })
    expect(s.phoneError).toBe('notMobile')
  })

  it('leaves the state alone on a failure the screen reports another way', () => {
    const s = typed()
    expect(signInReducer(s, { type: 'sendRefused', error: new ApiError(0, 'network'), now: T })).toBe(s)
  })
})

describe('the code step', () => {
  it('says how many tries are left, and clears it when the person types again', () => {
    const wrong = signInReducer(
      { ...atCode(), code: '4827' },
      { type: 'codeRefused', error: new ApiError(400, 'code_invalid', { attemptsLeft: 2 }), now: T },
    )
    expect(wrong.attemptsLeft).toBe(2)
    expect(signInReducer(wrong, { type: 'codeChanged', code: '4' }).attemptsLeft).toBeUndefined()
  })

  it('locks for the time the api says, then the old code is dead and only a new one helps', () => {
    let s: SignInState = signInReducer(atCode(), {
      type: 'codeRefused',
      error: new ApiError(429, 'too_many_attempts', { retryAfterSec: 60 }),
      now: T,
    })
    expect(signInView(s, T + 1_000)).toMatchObject({ locked: true, lockLeftSec: 59 })
    s = signInReducer(s, { type: 'tick', now: T + 30_000 })
    expect(s.codeExpired).toBe(false)
    s = signInReducer(s, { type: 'tick', now: T + 60_000 })
    expect(s.lockedUntil).toBeUndefined()
    expect(s.codeExpired).toBe(true)
    // a new code starts over: no lock, no tries used, the timer restarts, «Here's a new code.»
    s = signInReducer(s, { type: 'codeSent', resendAfterSec: 59, now: T + 61_000 })
    expect(s).toMatchObject({ step: 'code', codeExpired: false, resent: true, attemptsLeft: undefined, lockedUntil: undefined })
    expect(signInView(s, T + 61_000).resendInSec).toBe(59)
  })

  it('treats a code that ran out like the end of a lock', () => {
    const s = signInReducer(atCode(), { type: 'codeRefused', error: new ApiError(400, 'code_expired'), now: T })
    expect(s.codeExpired).toBe(true)
  })

  it('keeps the limit on a new code for the same number', () => {
    const s = signInReducer(atCode(), { type: 'sendRefused', error: new ApiError(429, 'rate_limited', { retryAfterSec: 600 }), now: T })
    expect(s.step).toBe('code')
    expect(signInView(s, T).tooManyCodesMin).toBe(10)
  })

  it('goes back to the phone step with the number kept', () => {
    const s = signInReducer(atCode(), { type: 'changeNumber' })
    expect(s).toMatchObject({ step: 'phone', phone: '65102030' })
  })

  it('ticks only while a clock runs', () => {
    expect(signInView(typed(), T).ticking).toBe(false)
    expect(signInView(atCode(), T).ticking).toBe(true)
    expect(signInView(atCode(), T + 60_000).ticking).toBe(false)
  })
})

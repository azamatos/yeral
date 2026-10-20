import { ApiError } from '@yeral/sdk'
import { describe, expect, it } from 'vitest'
import { initialSignIn, signInReducer, signInView, type SignInEvent, type SignInState } from './sign-in'

const T = 1_000_000
const NUMBER = '65102030'
const run = (...events: SignInEvent[]) => events.reduce(signInReducer, initialSignIn)
const typed = (phone = NUMBER) => run({ type: 'phoneChanged', phone })
const sent = (opts: { phone?: string; resend?: boolean; code?: string; now?: number } = {}): SignInEvent => ({
  type: 'codeSent',
  phone: opts.phone ?? NUMBER,
  resend: opts.resend ?? false,
  resendAfterSec: 59,
  code: opts.code,
  now: opts.now ?? T,
})
const refused = (error: ApiError, opts: { phone?: string; resend?: boolean; now?: number } = {}): SignInEvent => ({
  type: 'sendRefused',
  phone: opts.phone ?? NUMBER,
  resend: opts.resend ?? false,
  error,
  now: opts.now ?? T,
})
const atCode = (code?: string) => signInReducer(typed(), sent({ code }))

describe('the phone step', () => {
  it('keeps the error until the number changes', () => {
    const s = signInReducer(typed('651020'), { type: 'phoneInvalid', error: 'incomplete' })
    expect(s.phoneError).toBe('incomplete')
    expect(signInReducer(s, { type: 'phoneChanged', phone: '6510203' }).phoneError).toBeUndefined()
  })

  it('moves to the code step when the code is sent, with the resend timer from the api', () => {
    const s = atCode()
    expect(s).toMatchObject({ step: 'code', sentTo: NUMBER, code: '', resent: false })
    expect(signInView(s, T).resendInSec).toBe(59)
    expect(signInView(s, T + 17_000).resendInSec).toBe(42)
    expect(signInView(s, T + 60_000).resendInSec).toBe(0)
  })

  it('shows the code only when the api hands it out', () => {
    expect(atCode().shownCode).toBeUndefined()
    expect(atCode('4821').shownCode).toBe('4821')
  })

  it('stops at too many codes for this number, counted in minutes, and lets another number try', () => {
    const s = signInReducer(typed(), refused(new ApiError(429, 'rate_limited', { retryAfterSec: 2520 })))
    expect(s.step).toBe('phone')
    expect(signInView(s, T).tooManyCodesMin).toBe(42)
    expect(signInView(s, T + 60_000).tooManyCodesMin).toBe(41)
    expect(signInView(signInReducer(s, { type: 'phoneChanged', phone: '65102031' }), T).tooManyCodesMin).toBe(0)
    // the wait ends
    expect(signInReducer(s, { type: 'tick', now: T + 2_520_000 }).limit).toBeUndefined()
  })

  it('goes back to a code sent less than a minute ago instead of failing', () => {
    const s = signInReducer(typed(), refused(new ApiError(429, 'resend_too_soon', { retryAfterSec: 31 })))
    expect(s.step).toBe('code')
    expect(signInView(s, T).resendInSec).toBe(31)
  })

  it('keeps that code on screen when it is the same number (Change number, then Send code again)', () => {
    let s = signInReducer(atCode('4821'), { type: 'changeNumber' })
    s = signInReducer(s, refused(new ApiError(429, 'resend_too_soon', { retryAfterSec: 40 })))
    expect(s).toMatchObject({ step: 'code', shownCode: '4821' })
    // another number's code isn't shown for this one
    s = signInReducer(signInReducer(atCode('4821'), { type: 'changeNumber' }), { type: 'phoneChanged', phone: '65102031' })
    s = signInReducer(s, refused(new ApiError(429, 'resend_too_soon', { retryAfterSec: 40 }), { phone: '65102031' }))
    expect(s).toMatchObject({ step: 'code', sentTo: '65102031', shownCode: undefined })
  })

  it('opens a locked number on the code step with the lock running', () => {
    const s = signInReducer(typed(), refused(new ApiError(429, 'too_many_attempts', { retryAfterSec: 40 })))
    expect(s.step).toBe('code')
    expect(signInView(s, T)).toMatchObject({ locked: true, lockLeftSec: 40 })
  })

  it('takes a refusal of the number as «not a mobile number»', () => {
    const s = signInReducer(typed('12456789'), refused(new ApiError(400, 'validation_error'), { phone: '12456789' }))
    expect(s.phoneError).toBe('notMobile')
  })

  it('leaves the state alone on a failure the screen reports another way', () => {
    const s = typed()
    expect(signInReducer(s, refused(new ApiError(0, 'network')))).toBe(s)
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
    s = signInReducer(s, sent({ resend: true, code: '7305', now: T + 61_000 }))
    expect(s).toMatchObject({ step: 'code', codeExpired: false, resent: true, shownCode: '7305', attemptsLeft: undefined })
    expect(signInView(s, T + 61_000).resendInSec).toBe(59)
  })

  it('treats a code that ran out like the end of a lock', () => {
    const s = signInReducer(atCode(), { type: 'codeRefused', error: new ApiError(400, 'code_expired'), now: T })
    expect(s.codeExpired).toBe(true)
  })

  it('keeps the limit on a new code for the same number', () => {
    const s = signInReducer(atCode(), refused(new ApiError(429, 'rate_limited', { retryAfterSec: 600 }), { resend: true }))
    expect(s.step).toBe('code')
    expect(signInView(s, T).tooManyCodesMin).toBe(10)
  })

  it('goes back to the phone step with the number kept, and says the field should take the focus', () => {
    const s = signInReducer(atCode(), { type: 'changeNumber' })
    expect(s).toMatchObject({ step: 'phone', phone: NUMBER, changedNumber: 1 })
  })

  it('leaves the person on the phone step when a new code arrives after they went to change the number', () => {
    const s = signInReducer(signInReducer(atCode('4821'), { type: 'changeNumber' }), sent({ resend: true, code: '7305' }))
    expect(s).toMatchObject({ step: 'phone', shownCode: '7305', sentTo: NUMBER })
    // a refused one leaves it as it is
    const back = signInReducer(atCode(), { type: 'changeNumber' })
    expect(signInReducer(back, refused(new ApiError(429, 'too_many_attempts'), { resend: true }))).toBe(back)
  })

  it('ticks only while a clock runs', () => {
    expect(signInView(typed(), T).ticking).toBe(false)
    expect(signInView(atCode(), T).ticking).toBe(true)
    expect(signInView(atCode(), T + 60_000).ticking).toBe(false)
  })
})

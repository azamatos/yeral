/**
 * The phone and code steps of every sign-in (the business login, book B-02, B-07, design §27.2, §28.2; the client
 * site's login, C-18, C-19; ADR 0019; one shared code step, Q-157) as one state and the events that move it. The api holds the rules (3 tries, a 60-second lock, a new code after 59 s, 5 codes an hour for a
 * number, book Q-267); this keeps what the screen shows of them, and when each wait ends. Pure, so every turn is tested.
 */
import { isApiError, type ApiError } from '@yeral/sdk'

export type SignInStep = 'phone' | 'code'

export interface SignInState {
  step: SignInStep
  /** National digits as typed. */
  phone: string
  phoneError?: 'incomplete' | 'notMobile'
  /** The number the code went to (the code step's lead, and what the code is checked against). */
  sentTo?: string
  code: string
  /** The code on screen (first launch, Q-036): only when the api hands it out. */
  shownCode?: string
  /** When a new code may be asked for (epoch ms). */
  resendAt: number
  /** Tries left after a wrong code. */
  attemptsLeft?: number
  /** Three wrong codes: no tries until then (epoch ms). */
  lockedUntil?: number
  /** The code is spent (the lock ended, or it ran out): only «Get a new code» goes on. */
  codeExpired: boolean
  /** A new code replaced the old one. */
  resent: boolean
  /** Too many codes for this number: none until then (epoch ms). Codes are counted per number. */
  limit?: { phone: string; until: number }
  /** Counts «Change number» taps: the phone field takes the focus after each. */
  changedNumber: number
}

export const initialSignIn: SignInState = {
  step: 'phone',
  phone: '',
  code: '',
  resendAt: 0,
  codeExpired: false,
  resent: false,
  changedNumber: 0,
}

export type SignInEvent =
  | { type: 'phoneChanged'; phone: string }
  | { type: 'phoneInvalid'; error: 'incomplete' | 'notMobile' }
  /** `phone`: the number the code went to; `resend`: asked for from the code step («Get a new code»). */
  | { type: 'codeSent'; phone: string; resend: boolean; resendAfterSec: number; code?: string; now: number }
  | { type: 'sendRefused'; phone: string; resend: boolean; error: ApiError; now: number }
  | { type: 'codeChanged'; code: string }
  | { type: 'codeRefused'; error: ApiError; now: number }
  | { type: 'changeNumber' }
  | { type: 'tick'; now: number }
  | { type: 'reset' }

const secondsOf = (error: ApiError, fallback: number) => {
  const sec = Number(error.details.retryAfterSec)
  return Number.isFinite(sec) && sec > 0 ? sec : fallback
}

/** A fresh code step for `phone`: no tries used, no lock. */
const codeStep = (s: SignInState, phone: string): SignInState => ({
  ...s,
  step: 'code',
  sentTo: phone,
  code: '',
  attemptsLeft: undefined,
  lockedUntil: undefined,
  codeExpired: false,
})

export function signInReducer(s: SignInState, e: SignInEvent): SignInState {
  switch (e.type) {
    case 'phoneChanged':
      return { ...s, phone: e.phone, phoneError: undefined }
    case 'phoneInvalid':
      return { ...s, phoneError: e.error }
    case 'codeSent': {
      const fresh = { shownCode: e.code, resendAt: e.now + e.resendAfterSec * 1000 }
      // a new code arrived after the person went back to change the number: it's that number's, they stay
      if (e.resend && s.step === 'phone')
        return { ...s, ...fresh, sentTo: e.phone, attemptsLeft: undefined, lockedUntil: undefined, codeExpired: false }
      // the first code, or a new one replacing the old («Here's a new code.»)
      return { ...codeStep(s, e.phone), ...fresh, resent: e.resend }
    }
    case 'sendRefused': {
      const { error, now, phone } = e
      if (isApiError(error, 'rate_limited')) return { ...s, resent: false, limit: { phone, until: now + secondsOf(error, 3600) * 1000 } }
      // the person went back to change the number meanwhile: nothing else to show
      if (e.resend && s.step === 'phone') return s
      // a code went to this number less than a minute ago and still works: back to it (and to its code on screen)
      if (isApiError(error, 'resend_too_soon')) {
        const back = s.step === 'code' ? s : { ...codeStep(s, phone), shownCode: phone === s.sentTo ? s.shownCode : undefined }
        return { ...back, resendAt: now + secondsOf(error, 59) * 1000 }
      }
      // the number is locked after three wrong codes
      if (isApiError(error, 'too_many_attempts'))
        return { ...codeStep(s, phone), resent: false, lockedUntil: now + secondsOf(error, 60) * 1000 }
      if (isApiError(error, 'validation_error')) return { ...s, step: 'phone', phoneError: 'notMobile' }
      return s
    }
    case 'codeChanged':
      // typing again clears the wrong code's message (B-Login)
      return { ...s, code: e.code, attemptsLeft: undefined, resent: e.code ? false : s.resent }
    case 'codeRefused': {
      const { error, now } = e
      if (isApiError(error, 'code_invalid')) return { ...s, attemptsLeft: Number(error.details.attemptsLeft ?? 0) }
      if (isApiError(error, 'too_many_attempts'))
        return { ...s, code: '', attemptsLeft: undefined, resent: false, lockedUntil: now + secondsOf(error, 60) * 1000 }
      if (isApiError(error, 'code_expired')) return { ...s, code: '', attemptsLeft: undefined, resent: false, codeExpired: true }
      return s
    }
    case 'changeNumber':
      return {
        ...s,
        step: 'phone',
        code: '',
        attemptsLeft: undefined,
        resent: false,
        phoneError: undefined,
        changedNumber: s.changedNumber + 1,
      }
    case 'tick': {
      let next = s
      // the lock is over and the old code with it
      if (s.lockedUntil !== undefined && e.now >= s.lockedUntil) next = { ...next, lockedUntil: undefined, codeExpired: true }
      if (s.limit && e.now >= s.limit.until) next = { ...next, limit: undefined }
      return next
    }
    case 'reset':
      return initialSignIn
  }
}

/** What the screen shows at `now`: the waits in the units the messages count in. */
export function signInView(s: SignInState, now: number) {
  const number = s.step === 'code' ? (s.sentTo ?? s.phone) : s.phone
  const limitUntil = s.limit && s.limit.phone === number && now < s.limit.until ? s.limit.until : undefined
  const lockLeftSec = s.lockedUntil !== undefined ? Math.max(0, Math.ceil((s.lockedUntil - now) / 1000)) : 0
  return {
    resendInSec: Math.max(0, Math.ceil((s.resendAt - now) / 1000)),
    lockLeftSec,
    locked: lockLeftSec > 0,
    tooManyCodesMin: limitUntil !== undefined ? Math.max(1, Math.ceil((limitUntil - now) / 60_000)) : 0,
    /** A clock is running: the screen ticks every second while one is. */
    ticking: limitUntil !== undefined || (s.step === 'code' && (s.resendAt > now || lockLeftSec > 0)),
  }
}

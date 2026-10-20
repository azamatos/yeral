import { useMutation, type UseMutationOptions } from '@tanstack/react-query'
import { toE164 } from '@yeral/domain/phone'
import { isLocale, MARKET_LOCALES } from '@yeral/i18n/messages'
import { isApiError, type ApiError, type Sdk } from '@yeral/sdk'
import { useSdk } from '@yeral/sdk/react'
import { useEffect, useReducer, useState } from 'react'
import { useLocale } from 'use-intl'
import { phoneProblem } from '../lib/phone'
import { initialSignIn, signInReducer, signInView, type SignInEvent } from './sign-in'

/** What the api answers a right code: signed in (`me`, `isNew`), or "Is this you?" first (book Q-270). */
export type Verified = Awaited<ReturnType<NonNullable<ReturnType<Sdk['auth']['verify']>['mutationFn']>>>

/** Refusals the step shows in place; anything else (no connection, a server error) is the screen's toast. */
const SEND_REFUSALS = ['rate_limited', 'resend_too_soon', 'too_many_attempts', 'validation_error'] as const
const CODE_REFUSALS = ['code_invalid', 'too_many_attempts', 'code_expired'] as const

/** Asking for a code (`sdk.auth.sendCode()`; `sdk.me.phoneCode()` has the same shape) and what checking one sends. */
type SendCodeOptions = ReturnType<Sdk['auth']['sendCode']>
type VerifyBody = Parameters<NonNullable<ReturnType<Sdk['auth']['verify']>['mutationFn']>>[0]

export interface CodeStepsOptions<TVerified> {
  /** Asks for a code: `sdk.auth.sendCode()`, `sdk.me.phoneCode()`. */
  sendCode: SendCodeOptions
  /** Checks it: `sdk.auth.verify()`, `sdk.me.phoneVerify()`. */
  verify: Omit<UseMutationOptions<TVerified, Error, VerifyBody>, 'mutationKey'>
  /** The right code's answer. */
  onVerified: (answer: TVerified) => void
  /** A failure the steps can't show (the screen toasts it, or knows it: `phone_taken`, `phone_change_unavailable`). */
  onFailed: (error: unknown) => void
  /** Whether a right code ends the steps (they start over); false keeps them for what comes next. Default: always. */
  done?: (answer: TVerified) => boolean
}

/** The screen's language for a request's `lang` (an SMS's words, a new account's language), when the market offers it: the api takes no other. */
export function useRequestLanguage() {
  const raw = useLocale()
  return isLocale(raw) && MARKET_LOCALES.includes(raw) ? raw : undefined
}

/**
 * The phone and code steps against a pair of requests, with the clock the waits count on: the same rules for every code
 * (book Q-157, Q-267): the sign-in (`useSignIn`) and the phone change (book C-44) alike.
 */
export function useCodeSteps<TVerified>({ sendCode, verify: verifyOptions, onVerified, onFailed, done }: CodeStepsOptions<TVerified>) {
  const locale = useRequestLanguage()
  const [state, dispatch] = useReducer(signInReducer, initialSignIn)
  const [now, setNow] = useState(() => Date.now())
  const send = useMutation(sendCode)
  const verify = useMutation(verifyOptions)
  const view = signInView(state, now)

  // one ticker for the resend countdown, the lock and the hourly limit, only while one runs
  const { ticking } = view
  useEffect(() => {
    if (!ticking) return
    const timer = setInterval(() => {
      const at = Date.now()
      setNow(at)
      dispatch({ type: 'tick', now: at })
    }, 1000)
    return () => clearInterval(timer)
  }, [ticking])

  /** Events that start a wait carry the moment they happened, and the view moves to it at once. */
  const at = (event: (now: number) => SignInEvent) => {
    const moment = Date.now()
    setNow(moment)
    dispatch(event(moment))
  }

  const request = (phone: string, resend: boolean) => {
    if (send.isPending) return
    send.mutate(
      { phone: toE164(phone), lang: locale },
      {
        onSuccess: (sent) =>
          at((moment) => ({ type: 'codeSent', phone, resend, resendAfterSec: sent.resendAfterSec, code: sent.code, now: moment })),
        onError: (error) => {
          if (isApiError(error) && (SEND_REFUSALS as readonly string[]).includes(error.code))
            at((moment) => ({ type: 'sendRefused', phone, resend, error, now: moment }))
          else onFailed(error)
        },
      },
    )
  }

  return {
    state,
    view,
    sending: send.isPending,
    checking: verify.isPending,
    changePhone: (phone: string) => dispatch({ type: 'phoneChanged', phone }),
    changeCode: (code: string) => dispatch({ type: 'codeChanged', code }),
    sendCode: () => {
      const problem = phoneProblem(state.phone)
      if (problem) dispatch({ type: 'phoneInvalid', error: problem })
      else request(state.phone, false)
    },
    resend: () => request(state.sentTo ?? state.phone, true),
    submitCode: (code: string) => {
      if (!state.sentTo || verify.isPending) return
      verify.mutate(
        { phone: toE164(state.sentTo), code, lang: locale },
        {
          onSuccess: (answer) => {
            // the steps and their clocks are done (unless what comes next may send the person back to them)
            if (!done || done(answer)) dispatch({ type: 'reset' })
            onVerified(answer)
          },
          onError: (error) => {
            if (isApiError(error) && (CODE_REFUSALS as readonly string[]).includes(error.code))
              at((moment) => ({ type: 'codeRefused', error, now: moment }))
            else onFailed(error)
          },
        },
      )
    },
    changeNumber: () => dispatch({ type: 'changeNumber' }),
    /** Another number: everything starts again (the api still counts the codes per number). */
    reset: () => dispatch({ type: 'reset' }),
    /** A refusal that came later ("Is this you?" ran out: `code_expired`): back on the code step, shown there. */
    refuseCode: (error: ApiError) => at((moment) => ({ type: 'codeRefused', error, now: moment })),
  }
}

/**
 * The sign-in's phone and code steps (`auth.sendCode`, `auth.verify`). `onFailed` gets a failure the step can't show
 * (the screen toasts it); `onVerified` the right code's answer: signed in, or "Is this you?" first, which keeps the
 * steps (it may send the person back to them).
 */
export function useSignIn({ onVerified, onFailed }: { onVerified: (answer: Verified) => void; onFailed: (error: unknown) => void }) {
  const sdk = useSdk()
  return useCodeSteps({
    sendCode: sdk.auth.sendCode(),
    verify: sdk.auth.verify(),
    onVerified,
    onFailed,
    done: (answer) => !('isThisYou' in answer),
  })
}

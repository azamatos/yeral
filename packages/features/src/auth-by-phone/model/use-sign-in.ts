import { useMutation } from '@tanstack/react-query'
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

/** The screen's language for a request's `lang` (an SMS's words, a new account's language), when the market offers it: the api takes no other. */
export function useRequestLanguage() {
  const raw = useLocale()
  return isLocale(raw) && MARKET_LOCALES.includes(raw) ? raw : undefined
}

/**
 * The phone and code steps against the api (`auth.sendCode`, `auth.verify`), with the clock the waits count on.
 * `onFailed` gets a failure the step can't show (the screen toasts it); `onVerified` the right code's answer.
 */
export function useSignIn({ onVerified, onFailed }: { onVerified: (answer: Verified) => void; onFailed: (error: unknown) => void }) {
  const sdk = useSdk()
  const locale = useRequestLanguage()
  const [state, dispatch] = useReducer(signInReducer, initialSignIn)
  const [now, setNow] = useState(() => Date.now())
  const send = useMutation(sdk.auth.sendCode())
  const verify = useMutation(sdk.auth.verify())
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
            // signed in: the steps and their clocks are done ("Is this you?" may still send the person back to them)
            if (!('isThisYou' in answer)) dispatch({ type: 'reset' })
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

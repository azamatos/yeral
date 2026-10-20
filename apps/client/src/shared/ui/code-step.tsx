import { MARKET } from '@yeral/domain/market'
import { mobileStarts, PHONE_RULES, type CodeSteps } from '@yeral/features/auth-by-phone'
import { SignInCodeStep, type SignInCodeStepCopy } from '@yeral/ui/sign-in-code-step'
import { useEffect, useRef, type ReactNode } from 'react'
import { useFormatter, useTranslations } from 'use-intl'

const STARTS = mobileStarts()

/**
 * The phone and code steps (`@yeral/ui` SignInCodeStep, boxes 48 and M buttons: DS-Patterns v0.6) as the site draws
 * them wherever a code is asked for (the login, the phone change): the steps' state from `useCodeSteps`, the login's
 * words unless `words` says otherwise, the checks on the number, and the focus in the number when the step opens and
 * after «Change number». The lead above it («To log in with…») is the screen's.
 */
export function CodeStep({
  steps,
  sms = false,
  words,
  phoneHint,
  phoneError,
}: {
  steps: CodeSteps
  /** Codes go by SMS (the phone change): no code on the screen, the SMS words. */
  sms?: boolean
  words?: Partial<SignInCodeStepCopy>
  phoneHint?: ReactNode
  /** A refusal of the number the screen knows (`phone_taken`): shown before the steps' own checks. */
  phoneError?: ReactNode
}) {
  const t = useTranslations('login')
  const format = useFormatter()
  const formRef = useRef<HTMLFormElement>(null)
  const { state, view } = steps

  const { changedNumber, step } = state
  useEffect(() => {
    if (step === 'phone') formRef.current?.querySelector('input')?.focus()
  }, [changedNumber, step])

  const copy: SignInCodeStepCopy = {
    phoneLabel: t('phoneLabel'),
    sendCode: t('sendCode'),
    sending: t('sending'),
    codeLabel: t('codeLabel'),
    codeHint: t('codeHint'),
    yourCode: t('yourCode'),
    confirm: t('confirm'),
    checking: t('checking'),
    resend: t('resend'),
    resendIn: (time) => t('resendIn', { time }),
    codeExpired: t('codeExpired'),
    resent: t('resent'),
    ...words,
  }
  const numberError =
    phoneError ??
    (state.phoneError === 'incomplete'
      ? t('incomplete', { digits: MARKET.phone.length })
      : state.phoneError === 'notMobile'
        ? STARTS
          ? t('notMobile', { starts: format.list(STARTS, { type: 'disjunction' }) })
          : t('notMobilePlain')
        : undefined)

  return (
    <SignInCodeStep
      ref={formRef}
      step={step}
      size={48}
      sms={sms}
      copy={copy}
      phoneRules={PHONE_RULES}
      tooManyCodes={view.tooManyCodesMin ? t('tooManyCodes', { minutes: view.tooManyCodesMin }) : undefined}
      phone={state.phone}
      onPhoneChange={steps.changePhone}
      phoneHint={phoneHint}
      phoneError={numberError}
      sending={steps.sending}
      onSendCode={steps.sendCode}
      code={state.code}
      onCodeChange={steps.changeCode}
      onSubmitCode={steps.submitCode}
      shownCode={state.shownCode}
      checking={steps.checking}
      codeError={state.attemptsLeft !== undefined ? t('wrongCode', { left: state.attemptsLeft }) : undefined}
      locked={view.locked ? t('locked', { seconds: view.lockLeftSec }) : undefined}
      codeExpired={state.codeExpired}
      resendIn={view.resendInSec}
      resent={state.resent}
      onResend={steps.resend}
    />
  )
}

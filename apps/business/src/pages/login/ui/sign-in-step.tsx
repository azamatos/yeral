import { Link } from '@tanstack/react-router'
import { formatPhone, toE164 } from '@yeral/domain/phone'
import { SignInCodeStep, type SignInCodeStepCopy } from '@yeral/ui/sign-in-code-step'
import { useId } from 'react'
import { useFormatter, useTranslations } from 'use-intl'
import { AuthPage } from '@/shared/ui'
import { mobileStarts, PHONE_RULES } from '../lib/phone'
import type { useSignIn } from '../model/use-sign-in'
import { MARKET } from '@yeral/domain/market'

const STARTS = mobileStarts()

/** The phone step and the code step (B-Login `step` phone · code and their states), in the shared SignInCodeStep. */
export function SignInStep({ signIn }: { signIn: ReturnType<typeof useSignIn> }) {
  const t = useTranslations()
  const format = useFormatter()
  const titleId = useId()
  const { state, view } = signIn
  const brand = t('common.brand')
  const onCode = state.step === 'code'

  const copy: SignInCodeStepCopy = {
    phoneLabel: t('login.phoneLabel'),
    sendCode: t('login.sendCode'),
    sending: t('login.sending'),
    codeLabel: t('login.codeLabel'),
    codeHint: t('login.codeHint'),
    yourCode: t('login.yourCode'),
    confirm: t('login.confirm'),
    checking: t('login.checking'),
    resend: t('login.resend'),
    resendIn: (time) => t('login.resendIn', { time }),
    codeExpired: t('login.codeExpired'),
    resent: t('login.resent'),
  }
  const phoneError =
    state.phoneError === 'incomplete'
      ? t('login.incomplete', { digits: MARKET.phone.length })
      : state.phoneError === 'notMobile'
        ? STARTS
          ? t('login.notMobile', { starts: format.list(STARTS, { type: 'disjunction' }) })
          : t('login.notMobilePlain')
        : undefined

  return (
    <AuthPage
      titleId={titleId}
      title={onCode ? t('login.codeTitle') : t('login.title', { app: t('app.name', { brand }) })}
      lead={
        onCode ? (
          <>
            {t.rich('login.codeLead', {
              phone: formatPhone(toE164(state.sentTo ?? state.phone)),
              b: (chunks) => <b className="whitespace-nowrap tabular-nums">{chunks}</b>,
            })}{' '}
            <button
              type="button"
              onClick={signIn.changeNumber}
              className="cursor-pointer rounded-xs font-semibold whitespace-nowrap text-a-600 hover:text-a-700 hover:underline focus-visible:shadow-focus focus-visible:outline-none"
            >
              {t('login.changeNumber')}
            </button>
          </>
        ) : (
          t('login.lead')
        )
      }
    >
      <SignInCodeStep
        aria-labelledby={titleId}
        step={state.step}
        size={56}
        copy={copy}
        phoneRules={PHONE_RULES}
        tooManyCodes={view.tooManyCodesMin ? t('login.tooManyCodes', { minutes: view.tooManyCodesMin }) : undefined}
        phone={state.phone}
        onPhoneChange={signIn.changePhone}
        phoneHint={t('login.phoneHint', { brand })}
        phoneError={phoneError}
        sending={signIn.sending}
        onSendCode={signIn.sendCode}
        code={state.code}
        onCodeChange={signIn.changeCode}
        onSubmitCode={signIn.submitCode}
        shownCode={state.shownCode}
        checking={signIn.checking}
        codeError={state.attemptsLeft !== undefined ? t('login.wrongCode', { left: state.attemptsLeft }) : undefined}
        locked={view.locked ? t('login.locked', { seconds: view.lockLeftSec }) : undefined}
        codeExpired={state.codeExpired}
        resendIn={view.resendInSec}
        resent={state.resent}
        onResend={signIn.resend}
      />
      {!onCode && (
        <>
          <div className="h-px bg-n-200" />
          <p className="m-0 text-body text-n-600">
            {t.rich('login.noBusiness', {
              start: (chunks) => (
                <Link
                  to="/setup/$step"
                  params={{ step: 'phone' }}
                  className="rounded-xs font-semibold text-a-600 hover:text-a-700 hover:underline focus-visible:shadow-focus focus-visible:outline-none"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </>
      )}
    </AuthPage>
  )
}

import { Link } from '@tanstack/react-router'
import { MARKET } from '@yeral/domain/market'
import { formatPhone, toE164 } from '@yeral/domain/phone'
import { PHONE_RULES, type useSignIn } from '@yeral/features/auth-by-phone'
import { cn } from '@yeral/ui/cn'
import { SignInCodeStep, type SignInCodeStepCopy } from '@yeral/ui/sign-in-code-step'
import { useEffect, useId, useRef } from 'react'
import { useFormatter, useTranslations } from 'use-intl'
import { AuthPage, textLink } from '@/shared/ui'

/** The phone step and the code step (B-Login `step` phone · code and their states), in the shared SignInCodeStep. */
export function SignInStep({ signIn }: { signIn: ReturnType<typeof useSignIn> }) {
  const t = useTranslations()
  const format = useFormatter()
  const titleId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const { state, view } = signIn
  const brand = t('common.brand')
  const onCode = state.step === 'code'

  // «Change number» goes away with the code step: the number takes the focus instead of the page (B-Login focusStep)
  const { changedNumber } = state
  useEffect(() => {
    if (changedNumber) formRef.current?.querySelector('input')?.focus()
  }, [changedNumber])

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
        ? t('login.notMobile', { starts: format.list(MARKET.phone.mobilePrefixes, { type: 'disjunction' }) })
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
            <button type="button" onClick={signIn.changeNumber} className={cn(textLink, 'whitespace-nowrap')}>
              {t('login.changeNumber')}
            </button>
          </>
        ) : (
          t('login.lead')
        )
      }
    >
      <SignInCodeStep
        ref={formRef}
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
                <Link to="/setup/$step" params={{ step: 'phone' }} className={textLink}>
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

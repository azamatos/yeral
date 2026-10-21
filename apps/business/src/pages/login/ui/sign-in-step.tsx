import { Link } from '@tanstack/react-router'
import { formatPhone, toE164 } from '@yeral/domain/phone'
import { PHONE_RULES, useCodeOnScreen, type useSignIn } from '@yeral/features/auth-by-phone'
import { cn } from '@yeral/ui/cn'
import { SignInCodeStep } from '@yeral/ui/sign-in-code-step'
import { useEffect, useId, useRef } from 'react'
import { useTranslations } from 'use-intl'
import { useCodeStepWords } from '@/shared/i18n'
import { AuthPage, textLink } from '@/shared/ui'
import { SignInDemoNote } from './sign-in-demo-note'

/** The phone step and the code step (B-Login `step` phone · code and their states), in the shared SignInCodeStep. */
export function SignInStep({ signIn }: { signIn: ReturnType<typeof useSignIn> }) {
  const t = useTranslations()
  const titleId = useId()
  const formRef = useRef<HTMLFormElement>(null)
  const { state, view } = signIn
  const said = useCodeStepWords(signIn)
  const brand = t('common.brand')
  const onCode = state.step === 'code'
  const codeOnScreen = useCodeOnScreen()

  // «Change number» goes away with the code step: the number takes the focus instead of the page (B-Login focusStep)
  const { changedNumber } = state
  useEffect(() => {
    if (changedNumber) formRef.current?.querySelector('input')?.focus()
  }, [changedNumber])

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
      {!onCode && <SignInDemoNote />}
      <SignInCodeStep
        ref={formRef}
        aria-labelledby={titleId}
        step={state.step}
        size={56}
        copy={said.copy}
        phoneRules={PHONE_RULES}
        tooManyCodes={said.tooManyCodes}
        phone={state.phone}
        onPhoneChange={signIn.changePhone}
        phoneHint={t(codeOnScreen ? 'login.phoneHintDemo' : 'login.phoneHint', { brand })}
        phoneError={said.phoneError}
        sending={signIn.sending}
        onSendCode={signIn.sendCode}
        code={state.code}
        onCodeChange={signIn.changeCode}
        onSubmitCode={signIn.submitCode}
        shownCode={state.shownCode}
        checking={signIn.checking}
        codeError={said.codeError}
        locked={said.locked}
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

import { formatPhone, toE164 } from '@yeral/domain/phone'
import { PHONE_RULES, useCodeOnScreen, type useSignIn } from '@yeral/features/auth-by-phone'
import { cn } from '@yeral/ui/cn'
import { SignInCodeStep } from '@yeral/ui/sign-in-code-step'
import { useEffect, useRef } from 'react'
import { useTranslations } from 'use-intl'
import { useCodeStepWords } from '@/shared/i18n'
import { textLink } from '@/shared/ui'
import { SignInDemoNote } from './sign-in-demo-note'

type SignIn = ReturnType<typeof useSignIn>

/**
 * The phone step and the code step (B-Login `step` phone · code and their states, B-Onboarding step 1) in the shared
 * SignInCodeStep, with the demo note above the number. The page gives the title and the lead (`CodeLead` on the code
 * step); the login and the setup wizard's phone step both use it.
 */
export function SignInForm({ signIn, labelledBy }: { signIn: SignIn; labelledBy: string }) {
  const t = useTranslations()
  const formRef = useRef<HTMLFormElement>(null)
  const { state, view } = signIn
  const said = useCodeStepWords(signIn)
  const codeOnScreen = useCodeOnScreen()

  // «Change number» goes away with the code step: the number takes the focus instead of the page (B-Login focusStep)
  const { changedNumber } = state
  useEffect(() => {
    if (changedNumber) formRef.current?.querySelector('input')?.focus()
  }, [changedNumber])

  return (
    <>
      {state.step !== 'code' && <SignInDemoNote />}
      <SignInCodeStep
        ref={formRef}
        aria-labelledby={labelledBy}
        step={state.step}
        size={56}
        copy={said.copy}
        phoneRules={PHONE_RULES}
        tooManyCodes={said.tooManyCodes}
        phone={state.phone}
        onPhoneChange={signIn.changePhone}
        phoneHint={t(codeOnScreen ? 'login.phoneHintDemo' : 'login.phoneHint', { brand: t('common.brand') })}
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
    </>
  )
}

/** The code step's lead: «To log in with +993 65 10 20 30.» and «Change number». */
export function CodeLead({ signIn }: { signIn: SignIn }) {
  const t = useTranslations('login')
  const { state } = signIn
  return (
    <>
      {t.rich('codeLead', {
        phone: formatPhone(toE164(state.sentTo ?? state.phone)),
        b: (chunks) => <b className="whitespace-nowrap tabular-nums">{chunks}</b>,
      })}{' '}
      <button type="button" onClick={signIn.changeNumber} className={cn(textLink, 'whitespace-nowrap')}>
        {t('changeNumber')}
      </button>
    </>
  )
}

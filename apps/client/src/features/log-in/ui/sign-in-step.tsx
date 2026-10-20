import { MARKET } from '@yeral/domain/market'
import { formatPhone, toE164 } from '@yeral/domain/phone'
import { mobileStarts, PHONE_RULES, type useSignIn } from '@yeral/features/auth-by-phone'
import { cn } from '@yeral/ui/cn'
import { ModalDescription } from '@yeral/ui/modal'
import { SignInCodeStep, type SignInCodeStepCopy } from '@yeral/ui/sign-in-code-step'
import { useEffect, useRef } from 'react'
import { useFormatter, useTranslations } from 'use-intl'
import { textLink } from '@/shared/ui'
import { LoginHeader } from './login-header'

const STARTS = mobileStarts()

/**
 * The phone and the code (Auth «1 · Telefon», «2 · SMS kod», «4 · Ýalňyş kod»; book C-19 steps 1, 2, 4) in the shared
 * SignInCodeStep (boxes 48, M buttons: DS-Patterns v0.6), under the modal's header.
 */
export function SignInStep({ signIn }: { signIn: ReturnType<typeof useSignIn> }) {
  const t = useTranslations()
  const format = useFormatter()
  const formRef = useRef<HTMLFormElement>(null)
  const { state, view } = signIn
  const onCode = state.step === 'code'

  // the modal opens in the number, and «Change number» brings the focus back to it (Auth: focus on the phone field)
  const { changedNumber } = state
  useEffect(() => {
    if (state.step === 'phone') formRef.current?.querySelector('input')?.focus()
  }, [changedNumber, state.step])

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
    <>
      <LoginHeader title={onCode ? t('login.codeTitle') : t('login.title', { brand: t('common.brand') })}>
        <ModalDescription className="[&_b]:font-semibold [&_b]:text-n-900">
          {onCode ? (
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
          )}
        </ModalDescription>
      </LoginHeader>
      <SignInCodeStep
        ref={formRef}
        step={state.step}
        size={48}
        copy={copy}
        phoneRules={PHONE_RULES}
        tooManyCodes={view.tooManyCodesMin ? t('login.tooManyCodes', { minutes: view.tooManyCodesMin }) : undefined}
        phone={state.phone}
        onPhoneChange={signIn.changePhone}
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
    </>
  )
}

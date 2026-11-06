import { formatPhone, maskPhone, toE164 } from '@yeral/domain/phone'
import { PHONE_RULES, useCodeDelivery, type useSignIn } from '@yeral/features/auth-by-phone'
import { cn } from '@yeral/ui/cn'
import { SignInCodeStep } from '@yeral/ui/sign-in-code-step'
import { SendIcon } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { site } from '@/shared/config'
import { useCodeStepWords } from '@/shared/i18n'
import { textLink } from '@/shared/ui'

type SignIn = ReturnType<typeof useSignIn>

/**
 * The phone step and the code step (B-Login `step` phone · code and their states, B-Onboarding step 1) in the shared
 * SignInCodeStep (DS-Lists B10: the code goes to Telegram, ADR 0029). The page gives the title and the lead (`CodeLead` on the code
 * step); the login and the setup wizard's phone step both use it.
 */
export function SignInForm({ signIn, labelledBy }: { signIn: SignIn; labelledBy: string }) {
  const t = useTranslations()
  const formRef = useRef<HTMLFormElement>(null)
  const { state, view } = signIn
  const said = useCodeStepWords(signIn)
  const ahead = useCodeDelivery()
  const lang = useLocale()

  // «Change number» goes away with the code step: the number takes the focus instead of the page (B-Login focusStep)
  const { changedNumber } = state
  useEffect(() => {
    if (changedNumber) formRef.current?.querySelector('input')?.focus()
  }, [changedNumber])

  return (
    <>
      <SignInCodeStep
        ref={formRef}
        aria-labelledby={labelledBy}
        step={state.step}
        size={56}
        copy={said.copy}
        delivery={state.delivery ?? ahead}
        telegram={said.telegram}
        link={state.link}
        support={site.support}
        sendFailed={state.sendFailed}
        onRelink={signIn.relink}
        phoneRules={PHONE_RULES}
        tooManyCodes={said.tooManyCodes}
        phone={state.phone}
        onPhoneChange={signIn.changePhone}
        phoneHint={t('login.phoneHint', { brand: t('common.brand') })}
        phoneError={said.phoneError}
        sending={signIn.sending}
        onSendCode={signIn.sendCode}
        sendNote={
          ahead === 'telegram' ? (
            <span className="inline-flex items-center gap-1.5 self-center text-dense text-n-600">
              <SendIcon size={14} aria-hidden />
              {t('login.telegram.caption')}
            </span>
          ) : undefined
        }
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
      {state.step !== 'code' && (
        <p className="m-0 text-dense text-n-600">
          {t.rich('login.terms', {
            terms: (chunks) => (
              <a href={`${site.urls.client}/${lang}/terms`} target="_blank" rel="noreferrer" className={textLink}>
                {chunks}
              </a>
            ),
            privacy: (chunks) => (
              <a href={`${site.urls.client}/${lang}/privacy`} target="_blank" rel="noreferrer" className={textLink}>
                {chunks}
              </a>
            ),
          })}
        </p>
      )}
    </>
  )
}

/** The code step's lead: «We sent the code to your Telegram, +993 •• •• •• 10.» (or «To log in with +993 65 10 20 30.») and «Change number». */
export function CodeLead({ signIn }: { signIn: SignIn }) {
  const t = useTranslations('login')
  const { state } = signIn
  const phone = toE164(state.sentTo ?? state.phone)
  const b = (chunks: ReactNode) => <b className="whitespace-nowrap">{chunks}</b>
  const lead =
    state.delivery === 'telegram_link'
      ? t.rich('telegram.linkLead', { phone: maskPhone(phone, 'last'), b })
      : state.delivery === 'telegram'
        ? t.rich('telegram.codeLead', { phone: maskPhone(phone, 'last'), b })
        : t.rich('codeLead', { phone: formatPhone(phone), b })
  return (
    <>
      {lead}{' '}
      <button type="button" onClick={signIn.changeNumber} className={cn(textLink, 'whitespace-nowrap')}>
        {t('changeNumber')}
      </button>
    </>
  )
}

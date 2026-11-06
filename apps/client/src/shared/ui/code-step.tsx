import { MARKET } from '@yeral/domain/market'
import { formatPhone, maskPhone, toE164 } from '@yeral/domain/phone'
import { PHONE_RULES, useCodeDelivery, type CodeSteps } from '@yeral/features/auth-by-phone'
import { SignInCodeStep, type SignInCodeStepCopy, type TelegramStepCopy } from '@yeral/ui/sign-in-code-step'
import { SendIcon } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { useFormatter, useTranslations } from 'use-intl'
import { site } from '@/shared/config'

/**
 * The phone and code steps (`@yeral/ui` SignInCodeStep, DS-Lists B10: the code goes to Telegram, ADR 0029) as the site
 * draws them wherever a code is asked for (the login, the phone change): the steps' state from `useCodeSteps`, the
 * login's words unless `words` says otherwise, the checks on the number, and the focus in the number when the step
 * opens and after «Change number». The lead above it is the screen's (`codeLead`).
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
  const ahead = useCodeDelivery()
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
        ? t('notMobile', { starts: format.list(MARKET.phone.mobilePrefixes, { type: 'disjunction' }) })
        : undefined)
  const delivery = state.delivery ?? (sms ? 'sms' : ahead)

  return (
    <SignInCodeStep
      ref={formRef}
      step={step}
      size={48}
      sms={sms}
      copy={copy}
      delivery={delivery}
      telegram={useTelegramWords(state.sentTo ?? '')}
      link={state.link}
      support={site.support}
      phoneRules={PHONE_RULES}
      tooManyCodes={view.tooManyCodesMin ? t('tooManyCodes', { minutes: view.tooManyCodesMin }) : undefined}
      phone={state.phone}
      onPhoneChange={steps.changePhone}
      phoneHint={phoneHint}
      phoneError={numberError}
      sending={steps.sending}
      onSendCode={steps.sendCode}
      sendNote={ahead === 'telegram' && !sms ? <TelegramCaption /> : undefined}
      sendFailed={state.sendFailed}
      success={state.verified}
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
      onRelink={steps.relink}
    />
  )
}

/** «We'll send a code to your Telegram.» under Get the code (B10). */
export function TelegramCaption() {
  const t = useTranslations('login.telegram')
  return (
    <span className="inline-flex items-center gap-1.5 self-center text-dense text-n-600">
      <SendIcon size={14} aria-hidden />
      {t('caption')}
    </span>
  )
}

/** The Telegram code step's words (`login.telegram.*`), with the number masked as the lead shows it. */
export function useTelegramWords(phone: string): TelegramStepCopy {
  const t = useTranslations('login.telegram')
  const login = useTranslations('login')
  const brand = useTranslations('common')('brand')
  const masked = phone ? maskPhone(toE164(phone), 'last') : ''
  return {
    codeLabel: t('codeLabel'),
    checking: login('checking'),
    resend: login('resend'),
    resendIn: (time) => login('resendIn', { time }),
    codeExpired: t('codeExpired'),
    openTelegram: t('openTelegram'),
    noTelegram: t('noTelegram'),
    noTelegramHelp: t.rich('noTelegramHelp', { phone: masked, b: (chunks) => <b className="whitespace-nowrap">{chunks}</b> }),
    stillStuck: t('stillStuck', { brand }),
    call: t('call'),
    writeTelegram: t('write'),
    callBrand: t('callBrand', { brand }),
    writeOnTelegram: t('writeOnTelegram'),
    backToCode: t('backToCode'),
    close: t('close'),
    linkAgain: t('linkAgain'),
    linkSteps: [t('linkStep1'), t('linkStep2'), t('linkStep3')],
    sendFailed: t('sendFailed'),
    signedIn: t('signedIn'),
  }
}

/** The code step's lead by how the code went: «We sent the code to your Telegram, +993 •• •• •• 10.» or «To log in with +993 65 10 20 30.» */
export function CodeLeadText({ state }: { state: CodeSteps['state'] }) {
  const t = useTranslations('login')
  const phone = toE164(state.sentTo ?? state.phone)
  const b = (chunks: ReactNode) => <b className="whitespace-nowrap">{chunks}</b>
  if (state.delivery === 'telegram_link') return t.rich('telegram.linkLead', { phone: maskPhone(phone, 'last'), b })
  if (state.delivery === 'telegram') return t.rich('telegram.codeLead', { phone: maskPhone(phone, 'last'), b })
  return t.rich('codeLead', { phone: formatPhone(phone), b })
}

import { MARKET } from '@yeral/domain/market'
import { formatPhone, toE164 } from '@yeral/domain/phone'
import { mobileStarts, PHONE_RULES, useCodeSteps } from '@yeral/features/auth-by-phone'
import { isApiError } from '@yeral/sdk'
import { useSdk } from '@yeral/sdk/react'
import { Button } from '@yeral/ui/button'
import { cn } from '@yeral/ui/cn'
import { SignInCodeStep, type SignInCodeStepCopy } from '@yeral/ui/sign-in-code-step'
import { textLink } from '@yeral/ui/text-link'
import { toast } from '@yeral/ui/toast'
import { useEffect, useRef, useState } from 'react'
import { useFormatter, useTranslations } from 'use-intl'
import { useErrorText } from '@/shared/i18n'

const STARTS = mobileStarts()

/**
 * Changing the phone number (book C-44; Account-Profile's `.pbox` under «Phone»): the new number, then the code sent to
 * it, in the shared code step with the SMS words (codes for a phone change always go by SMS: the api refuses the change
 * while the sign-in code shows on the screen, `phone_change_unavailable`). Signed in here, other devices log out.
 * `onUnavailable`: the api refused the change after all (the profile hides «Change»).
 */
export function ChangePhoneBox({
  onDone,
  onCancel,
  onUnavailable,
}: {
  onDone: () => void
  onCancel: () => void
  onUnavailable: () => void
}) {
  const t = useTranslations()
  const format = useFormatter()
  const sdk = useSdk()
  const errorText = useErrorText()
  const formRef = useRef<HTMLFormElement>(null)
  // a number that has an account already (`phone_taken`): said under the field until it changes
  const [taken, setTaken] = useState<string | null>(null)
  const steps = useCodeSteps({
    sendCode: sdk.me.phoneCode(),
    verify: sdk.me.phoneVerify(),
    onVerified: () => {
      toast(t('profile.changed'))
      onDone()
    },
    onFailed: (error) => {
      if (isApiError(error, 'phone_change_unavailable')) {
        toast(errorText(error))
        onUnavailable()
      } else if (isApiError(error, 'phone_taken')) setTaken(steps.state.phone)
      else toast(errorText(error))
    },
  })
  const { state, view } = steps
  const onCode = state.step === 'code'

  // the box opens in the number, and «Change number» brings the focus back to it
  const { changedNumber } = state
  useEffect(() => {
    if (state.step === 'phone') formRef.current?.querySelector('input')?.focus()
  }, [changedNumber, state.step])

  const copy: SignInCodeStepCopy = {
    phoneLabel: t('profile.newPhone.label'),
    sendCode: t('login.sendCode'),
    sending: t('login.sending'),
    codeLabel: t('profile.newPhone.codeLabel'),
    codeHint: t('login.codeHint'),
    yourCode: t('login.yourCode'),
    confirm: t('login.confirm'),
    checking: t('login.checking'),
    resend: t('login.resend'),
    resendIn: (time) => t('login.resendIn', { time }),
    codeExpired: t('login.codeExpired'),
    resent: t('profile.newPhone.resent'),
  }
  const phoneError =
    taken !== null && taken === state.phone
      ? t('errors.phone_taken')
      : state.phoneError === 'incomplete'
        ? t('login.incomplete', { digits: MARKET.phone.length })
        : state.phoneError === 'notMobile'
          ? STARTS
            ? t('login.notMobile', { starts: format.list(STARTS, { type: 'disjunction' }) })
            : t('login.notMobilePlain')
          : undefined

  return (
    <div className="flex flex-col gap-3 rounded-m border border-n-200 p-4">
      {onCode && (
        <p className="m-0 text-small text-n-600 [&_b]:font-semibold [&_b]:text-n-900">
          {t.rich('profile.newPhone.codeLead', {
            phone: formatPhone(toE164(state.sentTo ?? state.phone)),
            b: (chunks) => <b className="whitespace-nowrap tabular-nums">{chunks}</b>,
          })}{' '}
          <button type="button" onClick={steps.changeNumber} className={cn(textLink, 'whitespace-nowrap')}>
            {t('profile.newPhone.changeNumber')}
          </button>
        </p>
      )}
      <SignInCodeStep
        ref={formRef}
        step={state.step}
        size={48}
        sms
        copy={copy}
        phoneRules={PHONE_RULES}
        tooManyCodes={view.tooManyCodesMin ? t('login.tooManyCodes', { minutes: view.tooManyCodesMin }) : undefined}
        phone={state.phone}
        onPhoneChange={steps.changePhone}
        phoneHint={t('profile.newPhone.hint', { digits: MARKET.phone.length })}
        phoneError={phoneError}
        sending={steps.sending}
        onSendCode={steps.sendCode}
        code={state.code}
        onCodeChange={steps.changeCode}
        onSubmitCode={steps.submitCode}
        checking={steps.checking}
        codeError={state.attemptsLeft !== undefined ? t('login.wrongCode', { left: state.attemptsLeft }) : undefined}
        locked={view.locked ? t('login.locked', { seconds: view.lockLeftSec }) : undefined}
        codeExpired={state.codeExpired}
        resendIn={view.resendInSec}
        resent={state.resent}
        onResend={steps.resend}
      />
      <Button variant="ghost" size="s" className="self-end" onClick={onCancel}>
        {t('profile.newPhone.cancel')}
      </Button>
    </div>
  )
}

import { MARKET } from '@yeral/domain/market'
import { formatPhone, toE164 } from '@yeral/domain/phone'
import { mobileStarts, PHONE_RULES, useCodeSteps } from '@yeral/features/auth-by-phone'
import { isApiError } from '@yeral/sdk'
import { SignInCodeStep, type SignInCodeStepCopy } from '@yeral/ui/sign-in-code-step'
import { toast } from '@yeral/ui/toast'
import { useState } from 'react'
import { useFormatter, useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { useAccount } from '../model/use-account'

const STARTS = mobileStarts()

/**
 * The phone in My profile (book B-13; B-Shell "Change number · expands in place"): the login number, read-only, with
 * "Change number" when the account may change it (`canChangePhone`: not while the sign-in code shows on the screen, so
 * at the first launch it isn't offered, as anything a person can't use). It opens in place: the new number, then the
 * code sent to it, with the sign-in's rules (`useCodeSteps` over `me.phoneCode` and `me.phoneVerify`); the old number
 * works until the new one is confirmed. Done: the row closes and a toast says so.
 */
export function ChangePhone({ phone, canChange }: { phone: string; canChange: boolean }) {
  const t = useTranslations('shell.profile')
  const ta = useTranslations()
  const { client } = useAccount()
  const [open, setOpen] = useState(false)
  const words = { app: ta('app.name', { brand: ta('common.brand') }), client: client.host }
  return (
    <div className="flex flex-col gap-1.5">
      <span id="profile-phone" className="text-dense font-semibold text-n-900">
        {t('phone')}
      </span>
      <div
        role="group"
        aria-labelledby="profile-phone"
        className="flex h-11 items-center gap-2 rounded-input border border-n-200 bg-n-50 pr-2 pl-3.5 text-body text-n-900"
      >
        <span className="font-medium tabular-nums">{formatPhone(phone)}</span>
        <span className="flex-1" />
        {canChange && !open && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex min-h-8 cursor-pointer items-center rounded-sm border-0 bg-transparent px-1.5 text-small font-semibold whitespace-nowrap text-a-600 hover:text-a-700 hover:underline focus-visible:shadow-focus focus-visible:outline-none"
          >
            {t('change')}
          </button>
        )}
      </div>
      <span className="text-dense text-n-600">{canChange ? t('phoneHint', words) : t('phoneHintFixed', words)}</span>
      {open && <NewNumber onClose={() => setOpen(false)} />}
    </div>
  )
}

/** The new number, then its code (SignInCodeStep, boxes 48, inline: S buttons with Cancel). */
function NewNumber({ onClose }: { onClose: () => void }) {
  const t = useTranslations()
  const format = useFormatter()
  const sdk = useSdk()
  const errorText = useErrorText()
  const [taken, setTaken] = useState(false)
  const steps = useCodeSteps({
    sendCode: sdk.me.phoneCode(),
    verify: sdk.me.phoneVerify(),
    onVerified: () => {
      toast(t('shell.profile.changed'))
      onClose()
    },
    onFailed: (error) => {
      if (isApiError(error, 'phone_taken')) {
        // taken (at the code too, when someone took it meanwhile): back on the number, which says so
        steps.changeNumber()
        setTaken(true)
      } else if (isApiError(error, 'phone_change_unavailable')) {
        // the account can't change its number now (the code shows on the screen): its words, and the row closes
        toast(errorText(error))
        onClose()
      } else toast(errorText(error))
    },
  })
  const { state, view } = steps
  const copy: SignInCodeStepCopy = {
    phoneLabel: t('shell.profile.newNumber'),
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
    cancel: t('shell.profile.cancel'),
  }
  const phoneError = taken
    ? t('shell.profile.taken')
    : state.phoneError === 'incomplete'
      ? t('login.incomplete', { digits: MARKET.phone.length })
      : state.phoneError === 'notMobile'
        ? STARTS
          ? t('login.notMobile', { starts: format.list(STARTS, { type: 'disjunction' }) })
          : t('login.notMobilePlain')
        : undefined

  return (
    <div className="mt-2 flex flex-col gap-4 rounded-m border border-n-200 p-4">
      {state.step === 'code' && state.sentTo && (
        <p className="m-0 text-dense text-n-600">
          {t.rich('shell.profile.changeTo', {
            phone: formatPhone(toE164(state.sentTo)),
            b: (chunks) => <b className="font-semibold whitespace-nowrap text-n-900 tabular-nums">{chunks}</b>,
          })}
        </p>
      )}
      <SignInCodeStep
        layout="inline"
        step={state.step}
        size={48}
        copy={copy}
        phoneRules={PHONE_RULES}
        onCancel={onClose}
        tooManyCodes={view.tooManyCodesMin ? t('login.tooManyCodes', { minutes: view.tooManyCodesMin }) : undefined}
        phone={state.phone}
        onPhoneChange={(digits) => {
          setTaken(false)
          steps.changePhone(digits)
        }}
        phoneError={phoneError}
        sending={steps.sending}
        onSendCode={steps.sendCode}
        code={state.code}
        onCodeChange={steps.changeCode}
        onSubmitCode={steps.submitCode}
        shownCode={state.shownCode}
        checking={steps.checking}
        codeError={state.attemptsLeft !== undefined ? t('login.wrongCode', { left: state.attemptsLeft }) : undefined}
        locked={view.locked ? t('login.locked', { seconds: view.lockLeftSec }) : undefined}
        codeExpired={state.codeExpired}
        resendIn={view.resendInSec}
        resent={state.resent}
        onResend={steps.resend}
      />
      {state.step === 'code' && <p className="m-0 text-dense text-n-600">{t('shell.profile.oldWorks')}</p>}
    </div>
  )
}

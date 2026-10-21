import { formatPhone, toE164 } from '@yeral/domain/phone'
import { PHONE_RULES, useCodeSteps } from '@yeral/features/auth-by-phone'
import { isApiError } from '@yeral/sdk'
import { cn } from '@yeral/ui/cn'
import { SignInCodeStep } from '@yeral/ui/sign-in-code-step'
import { toast } from '@yeral/ui/toast'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { site } from '@/shared/config'
import { useCodeStepWords, useErrorText } from '@/shared/i18n'
import { textLink } from '@/shared/ui'

/**
 * The phone in My profile (book B-13; B-Shell "Change number · expands in place"): the login number, read-only, with
 * "Change number" when the account may change it (`canChangePhone`: not while the sign-in code shows on the screen, so
 * at the first launch it isn't offered, as anything a person can't use). It opens in place: the new number, then the
 * code sent to it, with the sign-in's rules (`useCodeSteps` over `me.phoneCode` and `me.phoneVerify`); the old number
 * works until the new one is confirmed. Done: the row closes and a toast says so. The focus moves into the box and
 * comes back to "Change number" when it closes.
 */
export function ChangePhone({ phone, canChange }: { phone: string; canChange: boolean }) {
  const t = useTranslations('shell.profile')
  const ta = useTranslations()
  const [open, setOpen] = useState(false)
  const change = useRef<HTMLButtonElement>(null)
  const back = useRef(false)
  useEffect(() => {
    if (open || !back.current) return
    back.current = false
    change.current?.focus()
  }, [open])
  const close = () => {
    back.current = true
    setOpen(false)
  }
  const words = { app: ta('app.name', { brand: ta('common.brand') }), client: new URL(site.urls.client).host }
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
            ref={change}
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex min-h-8 cursor-pointer items-center rounded-sm border-0 bg-transparent px-1.5 text-small font-semibold whitespace-nowrap text-a-600 hover:text-a-700 hover:underline focus-visible:shadow-focus focus-visible:outline-none"
          >
            {t('change')}
          </button>
        )}
      </div>
      <span className="text-dense text-n-600">{canChange ? t('phoneHint', words) : t('phoneHintFixed', words)}</span>
      {open && <NewNumber current={phone} onClose={close} />}
    </div>
  )
}

/**
 * The new number, then its code (SignInCodeStep, boxes 48, inline: S buttons with Cancel). "Change number" beside the
 * number it was sent to goes back to the number, as the sign-in's code step does (B-Login).
 */
function NewNumber({ current, onClose }: { current: string; onClose: () => void }) {
  const t = useTranslations()
  const sdk = useSdk()
  const errorText = useErrorText()
  const [refused, setRefused] = useState<'taken' | 'same' | null>(null)
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
        setRefused('taken')
      } else if (isApiError(error, 'phone_change_unavailable')) {
        // the account can't change its number now (the code shows on the screen): its words, and the row closes
        toast(errorText(error))
        onClose()
      } else toast(errorText(error))
    },
  })
  const { state } = steps
  const said = useCodeStepWords(steps)

  return (
    <div className="mt-2 flex flex-col gap-4 rounded-m border border-n-200 p-4">
      {state.step === 'code' && state.sentTo && (
        <p className="m-0 text-dense text-n-600">
          {t.rich('shell.profile.changeTo', {
            phone: formatPhone(toE164(state.sentTo)),
            b: (chunks) => <b className="font-semibold whitespace-nowrap text-n-900 tabular-nums">{chunks}</b>,
          })}{' '}
          <button type="button" onClick={steps.changeNumber} className={cn(textLink, 'whitespace-nowrap')}>
            {t('login.changeNumber')}
          </button>
        </p>
      )}
      <SignInCodeStep
        layout="inline"
        step={state.step}
        size={48}
        copy={{ ...said.copy, phoneLabel: t('shell.profile.newNumber'), cancel: t('shell.profile.cancel') }}
        phoneRules={PHONE_RULES}
        onCancel={onClose}
        tooManyCodes={said.tooManyCodes}
        phone={state.phone}
        onPhoneChange={(digits) => {
          setRefused(null)
          steps.changePhone(digits)
        }}
        phoneError={refused ? t(`shell.profile.${refused}`) : said.phoneError}
        sending={steps.sending}
        // their own number isn't a change (the api would call it taken)
        onSendCode={() => (toE164(state.phone) === current ? setRefused('same') : steps.sendCode())}
        code={state.code}
        onCodeChange={steps.changeCode}
        onSubmitCode={steps.submitCode}
        shownCode={state.shownCode}
        checking={steps.checking}
        codeError={said.codeError}
        locked={said.locked}
        codeExpired={state.codeExpired}
        resendIn={steps.view.resendInSec}
        resent={state.resent}
        onResend={steps.resend}
      />
      {state.step === 'code' && <p className="m-0 text-dense text-n-600">{t('shell.profile.oldWorks')}</p>}
    </div>
  )
}

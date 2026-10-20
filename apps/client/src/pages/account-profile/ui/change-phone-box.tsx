import { MARKET } from '@yeral/domain/market'
import { formatPhone, toE164 } from '@yeral/domain/phone'
import { useCodeSteps } from '@yeral/features/auth-by-phone'
import { isApiError } from '@yeral/sdk'
import { useSdk } from '@yeral/sdk/react'
import { Button } from '@yeral/ui/button'
import { cn } from '@yeral/ui/cn'
import { textLink } from '@yeral/ui/text-link'
import { toast } from '@yeral/ui/toast'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { useErrorText } from '@/shared/i18n'
import { CodeStep } from '@/shared/ui'

/**
 * Changing the phone number (book C-44; Account-Profile's `.pbox` under «Phone»): the new number, then the code sent to
 * it, in the site's code step with the SMS words (codes for a phone change always go by SMS: the api refuses the change
 * while the sign-in code shows on the screen, `phone_change_unavailable`). Signed in here, other devices log out.
 * `onUnavailable`: the api refused the change after all (the profile hides «Change»).
 */
export function ChangePhoneBox({
  currentPhone,
  onDone,
  onCancel,
  onUnavailable,
}: {
  /** The account's number (E.164): the same number again isn't a change. */
  currentPhone: string
  onDone: () => void
  onCancel: () => void
  onUnavailable: () => void
}) {
  const t = useTranslations()
  const sdk = useSdk()
  const errorText = useErrorText()
  // a number refused before a code: someone else's (`phone_taken`, also when checking the code) or this account's own
  const [refused, setRefused] = useState<{ phone: string; why: 'taken' | 'same' } | null>(null)
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
      } else if (isApiError(error, 'phone_taken')) {
        // taken meanwhile (at the code): back to the number, which says so
        const phone = steps.state.sentTo ?? steps.state.phone
        if (steps.state.step === 'code') steps.changeNumber()
        setRefused({ phone, why: 'taken' })
      } else toast(errorText(error))
    },
  })
  const { state } = steps
  const busy = steps.sending || steps.checking

  const sendCode = () => {
    if (state.phone.length === MARKET.phone.length && toE164(state.phone) === currentPhone) setRefused({ phone: state.phone, why: 'same' })
    else steps.sendCode()
  }
  const phoneError =
    refused && refused.phone === state.phone ? (refused.why === 'taken' ? t('errors.phone_taken') : t('profile.newPhone.same')) : undefined

  return (
    <div className="flex flex-col gap-3 rounded-m border border-n-200 p-4">
      {state.step === 'code' && (
        <p className="m-0 text-small text-n-600 [&_b]:font-semibold [&_b]:text-n-900">
          {t.rich('profile.newPhone.codeLead', {
            phone: formatPhone(toE164(state.sentTo ?? state.phone)),
            b: (chunks) => <b className="whitespace-nowrap tabular-nums">{chunks}</b>,
          })}{' '}
          <button type="button" onClick={steps.changeNumber} disabled={busy} className={cn(textLink, 'whitespace-nowrap')}>
            {t('profile.newPhone.changeNumber')}
          </button>
        </p>
      )}
      <CodeStep
        steps={{ ...steps, sendCode }}
        sms
        words={{
          phoneLabel: t('profile.newPhone.label'),
          codeLabel: t('profile.newPhone.codeLabel'),
          resent: t('profile.newPhone.resent'),
        }}
        phoneHint={t('profile.newPhone.hint', { digits: MARKET.phone.length })}
        phoneError={phoneError}
      />
      {/* not while a code is on its way or being checked: the change would finish behind a closed box */}
      <Button variant="ghost" size="s" className="self-end" disabled={busy} onClick={onCancel}>
        {t('profile.newPhone.cancel')}
      </Button>
    </div>
  )
}

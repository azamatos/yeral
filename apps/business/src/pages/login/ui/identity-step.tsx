import { useMutation } from '@tanstack/react-query'
import { isApiError, type ApiError } from '@yeral/sdk'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { cn } from '@yeral/ui/cn'
import { useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { ContactYeralLink } from '@/features/contact-yeral'
import { AuthPage, textLink } from '@/shared/ui'

/**
 * "Is this you?" (book Q-270): the code was right, but the number's account hasn't been used for 6 months, so the
 * person says whether it's theirs before anyone signs in. Not drawn: the invite card's pattern (title, lead, a
 * primary and a secondary L button, a way back).
 */
export function IdentityStep({
  name,
  ticket,
  onAnswered,
  onBack,
  onExpired,
  onFailed,
}: {
  name: string | null
  ticket: string
  /** Signed in: to this account (yes) or a fresh one (no). */
  onAnswered: () => void
  /** Another number: back to the phone step. */
  onBack: () => void
  /** The question ran out or was answered elsewhere: the code step again. */
  onExpired: (error: ApiError) => void
  onFailed: (error: unknown) => void
}) {
  const t = useTranslations()
  const sdk = useSdk()
  const locale = useLocale()
  const answer = useMutation(sdk.auth.answerIdentity())
  const [ownsWorkspace, setOwnsWorkspace] = useState(false)
  // "No" is refused and turns off: the focus goes to the way forward, Contact Ýeral
  const contactLink = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (ownsWorkspace) contactLink.current?.focus()
  }, [ownsWorkspace])
  const brand = t('common.brand')

  // one answer at a time: the ticket settles the question once
  const pending = answer.isPending
  const sayingYes = pending && answer.variables.yes
  const sayingNo = pending && !answer.variables.yes
  const reply = (yes: boolean) =>
    !pending &&
    answer.mutate(
      { ticket, yes, lang: locale },
      {
        onSuccess: onAnswered,
        onError: (error) => {
          if (isApiError(error, 'code_expired')) onExpired(error)
          else if (isApiError(error, 'owns_workspace')) setOwnsWorkspace(true)
          else onFailed(error)
        },
      },
    )

  return (
    <AuthPage
      focusKey="identity"
      title={name ? t('login.identity.title', { name }) : t('login.identity.titleNoName')}
      lead={t('login.identity.lead')}
    >
      {ownsWorkspace && (
        <Callout tone="danger" actions={<ContactYeralLink ref={contactLink} />}>
          {t('login.identity.ownsWorkspace', { brand })}
        </Callout>
      )}
      <div className="flex flex-col gap-3">
        <Button variant="primary" size="l" className="w-full" loading={sayingYes} disabled={sayingNo} onClick={() => reply(true)}>
          {t('login.identity.yes')}
        </Button>
        <Button
          variant="secondary"
          size="l"
          className="w-full"
          loading={sayingNo}
          disabled={ownsWorkspace || sayingYes}
          onClick={() => reply(false)}
        >
          {t('login.identity.no')}
        </Button>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={onBack}
        className={cn(textLink, 'hit inline-flex min-h-8 items-center self-center text-small')}
      >
        {t('login.changeNumber')}
      </button>
    </AuthPage>
  )
}

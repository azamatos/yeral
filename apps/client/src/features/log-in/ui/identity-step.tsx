import { useMutation } from '@tanstack/react-query'
import { isLocale, MARKET_LOCALES } from '@yeral/i18n'
import { isApiError, type ApiError } from '@yeral/sdk'
import { useSdk } from '@yeral/sdk/react'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { cn } from '@yeral/ui/cn'
import { ModalDescription } from '@yeral/ui/modal'
import { useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { textLink } from '@/shared/ui'
import { LoginHeader } from './login-header'

/**
 * "Is this you?" (book Q-270, C-18/C-19 edge cases): the code was right, but the number's account hasn't been used for
 * 6 months, so the person says whether it's theirs before anyone signs in. Not drawn: the business login's pattern
 * (title, lead, a primary and a secondary button, a way back) inside the modal. Not reached while the code is on the
 * screen (the api asks it only when codes go by SMS).
 */
export function IdentityStep({
  name,
  ticket,
  onBack,
  onExpired,
  onFailed,
}: {
  name: string | null
  ticket: string
  /** Another number: back to the phone step. */
  onBack: () => void
  /** The question ran out or was answered elsewhere: the code step again. */
  onExpired: (error: ApiError) => void
  onFailed: (error: unknown) => void
}) {
  const t = useTranslations()
  const sdk = useSdk()
  const raw = useLocale()
  const answer = useMutation(sdk.auth.answerIdentity())
  const [ownsWorkspace, setOwnsWorkspace] = useState(false)
  const yesRef = useRef<HTMLButtonElement>(null)
  const brand = t('common.brand')

  // the step starts on its answer
  useEffect(() => yesRef.current?.focus(), [])

  // one answer at a time: the ticket settles the question once; signed in, the modal goes on by itself (`me`)
  const pending = answer.isPending
  const reply = (yes: boolean) =>
    !pending &&
    answer.mutate(
      { ticket, yes, lang: isLocale(raw) && MARKET_LOCALES.includes(raw) ? raw : undefined },
      {
        onError: (error) => {
          if (isApiError(error, 'code_expired')) onExpired(error)
          else if (isApiError(error, 'owns_workspace')) setOwnsWorkspace(true)
          else onFailed(error)
        },
      },
    )

  return (
    <>
      <LoginHeader title={name ? t('login.identity.title', { name }) : t('login.identity.titleNoName')}>
        <ModalDescription>{t('login.identity.lead')}</ModalDescription>
      </LoginHeader>
      {ownsWorkspace && <Callout tone="danger">{t('login.identity.ownsWorkspace', { brand })}</Callout>}
      <div className="flex flex-col gap-3">
        <Button
          ref={yesRef}
          variant="primary"
          className="w-full"
          loading={pending && answer.variables.yes}
          disabled={pending && !answer.variables.yes}
          onClick={() => reply(true)}
        >
          {t('login.identity.yes')}
        </Button>
        <Button
          variant="secondary"
          className="w-full"
          loading={pending && !answer.variables.yes}
          disabled={ownsWorkspace || (pending && answer.variables.yes)}
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
    </>
  )
}

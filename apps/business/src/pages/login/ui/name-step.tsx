import { useMutation } from '@tanstack/react-query'
import { Button } from '@yeral/ui/button'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslations } from 'use-intl'
import { NameFields, VerifiedNumber } from '@/features/sign-in'
import { useSdk } from '@/shared/api'
import { AuthPage } from '@/shared/ui'

/**
 * "What's your name?" (B-Login `step=name`, book B-07 step 3): someone without a name on their account gives a first
 * name (required) and a surname (optional, book Q-156) before going on; the team sees them by it. The optional photo
 * waits for the api's photo upload (P2 step 4).
 */
export function NameStep({ phone, onFailed }: { phone: string; onFailed: (error: unknown) => void }) {
  const t = useTranslations('login')
  const tc = useTranslations('common')
  const sdk = useSdk()
  const update = useMutation(sdk.me.update())
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [missing, setMissing] = useState(false)
  const firstRef = useRef<HTMLInputElement>(null)

  // the step starts in its field (B-Login focusStep)
  useEffect(() => firstRef.current?.focus(), [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (update.isPending) return
    const firstName = first.trim()
    if (!firstName) {
      setMissing(true)
      firstRef.current?.focus()
      return
    }
    update.mutate({ firstName, surname: last.trim() || null }, { onError: onFailed })
  }

  return (
    <AuthPage title={t('name.title')} lead={t('name.lead', { brand: tc('brand') })}>
      <form noValidate onSubmit={submit} className="flex flex-col gap-6">
        <VerifiedNumber phone={phone} />
        <NameFields
          first={first}
          last={last}
          onFirst={(value) => {
            setFirst(value)
            setMissing(false)
          }}
          onLast={setLast}
          error={missing ? t('name.required') : undefined}
          firstRef={firstRef}
        />
        <Button type="submit" variant="primary" size="l" className="w-full" loading={update.isPending}>
          {t('name.continue')}
        </Button>
      </form>
    </AuthPage>
  )
}

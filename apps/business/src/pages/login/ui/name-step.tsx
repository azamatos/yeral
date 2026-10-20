import { useMutation } from '@tanstack/react-query'
import { NAME_MAX } from '@yeral/domain/names'
import { formatPhone } from '@yeral/domain/phone'
import { Button } from '@yeral/ui/button'
import { Field } from '@yeral/ui/field'
import { Input } from '@yeral/ui/input'
import { CircleCheck } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslations } from 'use-intl'
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
        <p className="m-0 flex flex-wrap items-center gap-2.5 rounded-m border border-n-200 bg-n-50 px-4 py-3 text-small">
          <CircleCheck aria-hidden className="size-5 text-st-completed-dot" />
          <span className="font-semibold whitespace-nowrap tabular-nums">{formatPhone(phone)}</span>
          <span className="text-dense text-n-600">{t('name.verified')}</span>
        </p>
        <Field label={t('name.first')} error={missing ? t('name.required') : undefined}>
          <Input
            ref={firstRef}
            value={first}
            maxLength={NAME_MAX}
            autoComplete="given-name"
            placeholder={t('name.firstPlaceholder')}
            onChange={(e) => {
              setFirst(e.target.value)
              setMissing(false)
            }}
          />
        </Field>
        <Field label={t.rich('name.last', { optional: (chunks) => <span className="font-normal text-n-600">{chunks}</span> })}>
          <Input value={last} maxLength={NAME_MAX} autoComplete="family-name" onChange={(e) => setLast(e.target.value)} />
        </Field>
        <Button type="submit" variant="primary" size="l" className="w-full" loading={update.isPending}>
          {t('name.continue')}
        </Button>
      </form>
    </AuthPage>
  )
}

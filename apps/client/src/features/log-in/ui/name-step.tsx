import { useMutation } from '@tanstack/react-query'
import { NAME_MAX } from '@yeral/domain/names'
import { formatPhone } from '@yeral/domain/phone'
import { useSdk } from '@yeral/sdk/react'
import { Button } from '@yeral/ui/button'
import { Field } from '@yeral/ui/field'
import { Input } from '@yeral/ui/input'
import { ModalDescription } from '@yeral/ui/modal'
import { BadgeCheck } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslations } from 'use-intl'
import { LoginHeader } from './login-header'

/**
 * A new account's name (Auth «3 · Täze ulanyjy», book C-19 step 3): the verified number, a first name (required) and a
 * surname (optional, book Q-156), «Continue». Saved to the account (`PATCH /v1/me`); businesses see the whole name.
 */
export function NameStep({ phone, onFailed }: { phone: string; onFailed: (error: unknown) => void }) {
  const t = useTranslations('login')
  const sdk = useSdk()
  const update = useMutation(sdk.me.update())
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [missing, setMissing] = useState(false)
  const firstRef = useRef<HTMLInputElement>(null)

  // the step starts in its field (Auth: the first name has the focus)
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
    <>
      <LoginHeader title={t('name.title')}>
        <ModalDescription>{t('name.lead')}</ModalDescription>
      </LoginHeader>
      <form noValidate onSubmit={submit} className="flex flex-col gap-5">
        <p className="m-0 inline-flex flex-wrap items-center gap-2 text-small">
          <BadgeCheck aria-hidden className="size-[18px] flex-none text-a-500" />
          <span className="whitespace-nowrap tabular-nums">{formatPhone(phone)}</span>
          <span className="text-dense text-n-600">· {t('name.verified')}</span>
        </p>
        <Field label={t('name.first')} error={missing ? t('name.required') : undefined}>
          <Input
            ref={firstRef}
            value={first}
            maxLength={NAME_MAX}
            autoComplete="given-name"
            onChange={(e) => {
              setFirst(e.target.value)
              setMissing(false)
            }}
          />
        </Field>
        <Field label={t.rich('name.last', { optional: (chunks) => <span className="font-normal text-n-600">{chunks}</span> })}>
          <Input value={last} maxLength={NAME_MAX} autoComplete="family-name" onChange={(e) => setLast(e.target.value)} />
        </Field>
        <Button type="submit" variant="primary" className="w-full" loading={update.isPending}>
          {t('name.continue')}
        </Button>
      </form>
    </>
  )
}

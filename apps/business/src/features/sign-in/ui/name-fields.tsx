import { NAME_MAX } from '@yeral/domain/names'
import { formatPhone } from '@yeral/domain/phone'
import { Field } from '@yeral/ui/field'
import { Input } from '@yeral/ui/input'
import { CircleCheck } from 'lucide-react'
import type { ReactNode, Ref } from 'react'
import { useTranslations } from 'use-intl'

/**
 * The name for a new account (B-Login `step=name`, B-Onboarding step 1, book B-07 step 3): a first name (required) and
 * a surname (optional, book Q-156); the team sees the person by it. The page lays the two fields out and saves them.
 */
export function NameFields({
  first,
  last,
  onFirst,
  onLast,
  error,
  firstRef,
}: {
  first: string
  last: string
  onFirst: (value: string) => void
  onLast: (value: string) => void
  /** «Enter your first name.» under the first name. */
  error?: string
  firstRef?: Ref<HTMLInputElement>
}) {
  const t = useTranslations('login.name')
  return (
    <>
      <Field label={t('first')} error={error}>
        <Input
          ref={firstRef}
          value={first}
          maxLength={NAME_MAX}
          autoComplete="given-name"
          placeholder={t('firstPlaceholder')}
          onChange={(e) => onFirst(e.target.value)}
        />
      </Field>
      <Field label={t.rich('last', { optional: (chunks) => <span className="font-normal text-n-600">{chunks}</span> })}>
        <Input value={last} maxLength={NAME_MAX} autoComplete="family-name" onChange={(e) => onLast(e.target.value)} />
      </Field>
    </>
  )
}

/** «+993 65 10 20 30 · Number verified» above the name (B-Login `.okl`), with the page's action at the end. */
export function VerifiedNumber({ phone, action }: { phone: string; action?: ReactNode }) {
  const t = useTranslations('login.name')
  return (
    <p className="m-0 flex flex-wrap items-center gap-2.5 rounded-m border border-n-200 bg-n-50 px-4 py-3 text-small">
      <CircleCheck aria-hidden className="size-5 text-st-completed-dot" />
      <span className="font-semibold whitespace-nowrap tabular-nums">{formatPhone(phone)}</span>
      <span className="text-dense text-n-600">{t('verified')}</span>
      {action && <span className="ms-auto">{action}</span>}
    </p>
  )
}

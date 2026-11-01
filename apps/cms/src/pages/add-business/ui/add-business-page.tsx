import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { MARKET } from '@yeral/domain/market'
import { COUNTRY_PREFIX, formatNational, isMobile, toE164 } from '@yeral/domain/phone'
import { BackLink } from '@yeral/ui/back-link'
import { Button } from '@yeral/ui/button'
import { Field, FieldMessage } from '@yeral/ui/field'
import { Input } from '@yeral/ui/input'
import { PhoneInput } from '@yeral/ui/phone-input'
import { Select } from '@yeral/ui/select'
import { toast } from '@yeral/ui/toast'
import { useState, type FormEvent } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { TeamPage } from '@/widgets/team-shell'

const PHONE = { prefix: COUNTRY_PREFIX, maxDigits: MARKET.phone.length, format: formatNational }

/**
 * `/businesses/new` (book F-238, Q-002): a business for an owner the team has met: a draft on the owner's phone, which
 * their sign-in reopens at its next step. Only what the owner can't add themselves later is asked.
 */
export function AddBusinessPage() {
  const t = useTranslations('addBusiness')
  const sdk = useSdk()
  const navigate = useNavigate()
  const errorText = useErrorText()
  const categories = useQuery(sdk.catalog.categories('en'))
  const add = useMutation(sdk.admin.addBusiness())
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [digits, setDigits] = useState('')
  const [tried, setTried] = useState(false)
  const badPhone = !isMobile(digits)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setTried(true)
    if (badPhone) return
    add.mutate(
      { name, categoryId, owner: { name: ownerName, phone: toE164(digits) } },
      {
        onSuccess: ({ id }) => {
          toast(t('added', { name }))
          void navigate({ to: '/businesses/$id', params: { id } })
        },
      },
    )
  }

  return (
    <TeamPage
      title={t('title')}
      back={
        <BackLink asChild>
          <Link to="/businesses">{t('back')}</Link>
        </BackLink>
      }
    >
      <form onSubmit={submit} className="flex max-w-120 flex-col gap-4">
        <p className="text-small text-n-600">{t('lead')}</p>
        <Field label={t('name')}>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </Field>
        <Field label={t('category')}>
          <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
            <option value="" disabled>
              {t('pick')}
            </option>
            {categories.data?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t('ownerName')}>
          <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required />
        </Field>
        <Field label={t('ownerPhone')} hint={t('ownerPhoneHint')} error={tried && badPhone ? t('badPhone') : undefined}>
          <PhoneInput {...PHONE} value={digits} onValueChange={setDigits} />
        </Field>
        {add.error && <FieldMessage>{errorText(add.error)}</FieldMessage>}
        <Button type="submit" variant="primary" loading={add.isPending} className="self-start">
          {t('submit')}
        </Button>
      </form>
    </TeamPage>
  )
}

import { useMutation } from '@tanstack/react-query'
import type { ClientCard } from '@yeral/contract/clients'
import { CLIENT_SOURCES, type ClientSource } from '@yeral/domain/model'
import { nationalDigits, toE164 } from '@yeral/domain/phone'
import { PHONE_RULES } from '@yeral/features/auth-by-phone'
import { useFmt } from '@yeral/i18n'
import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { Field } from '@yeral/ui/field'
import { Input } from '@yeral/ui/input'
import { PhoneInput } from '@yeral/ui/phone-input'
import { NativeSelect as Select } from '@yeral/ui/select'
import { TagInput } from '@yeral/ui/tag-input'
import { toast } from '@yeral/ui/toast'
import { useState, type FormEvent } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'

/**
 * The head in edit mode (B-Client `edit`, book B-34 step 6): name, number (read-only when a Ýeral account holds it),
 * birthday, how they found you, the team's tags. The tags worked out from the bookings aren't here to change.
 */
export function ClientEdit({ slug, card, today, onDone }: { slug: string; card: ClientCard; today: string; onDone: () => void }) {
  const t = useTranslations('clientCard.edit')
  const add = useTranslations('clients.add')
  const sources = useTranslations('clients.sources')
  const fmt = useFmt()
  const sdk = useSdk()
  const errorText = useErrorText()
  const update = useMutation(sdk.clients.update(slug))
  const [name, setName] = useState(card.name ?? '')
  const [digits, setDigits] = useState(card.phone ? nationalDigits(card.phone) : '')
  const [birthday, setBirthday] = useState(card.birthday ?? '')
  const [source, setSource] = useState<ClientSource | ''>(card.source ?? '')
  const [tags, setTags] = useState<string[]>(card.tags)

  // a record whose number passed to someone else has none, and may stay so
  const numberOk = card.account || digits.length === PHONE_RULES.maxDigits || (!card.phone && !digits)

  const save = (e: FormEvent) => {
    e.preventDefault()
    const number = !card.account && digits ? toE164(digits) : undefined
    update.mutate(
      {
        id: card.id,
        name: name.trim() || null,
        birthday: birthday || null,
        source: source || null,
        tags,
        ...(number && number !== card.phone ? { phone: number } : {}),
      },
      {
        onSuccess: () => {
          toast(t('saved'))
          onDone()
        },
        onError: (error) => toast(errorText(error)),
      },
    )
  }

  return (
    <form onSubmit={save} className="flex items-start gap-5 pb-7 max-sm:flex-wrap max-sm:gap-4">
      <Avatar name={card.name ?? ''} size={64} letters={1} tone="tint" decorative />
      <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-4">
        <h2 className="m-0 text-[17px] leading-6 font-semibold text-n-900">{t('title')}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('name')}>
            <Input maxLength={80} autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          {card.account ? (
            <Field label={t('phone')} hint={t('phoneLocked')}>
              <Input readOnly value={card.phone ? fmt.phone(card.phone) : ''} />
            </Field>
          ) : (
            <Field label={t('phone')}>
              <PhoneInput {...PHONE_RULES} size={44} value={digits} onValueChange={setDigits} />
            </Field>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={add('birthday')}>
            <Input type="date" max={today} value={birthday} onChange={(e) => setBirthday(e.target.value)} />
          </Field>
          <Field label={add('source')}>
            <Select value={source} onChange={(e) => setSource(e.target.value as ClientSource | '')}>
              <option value="">{add('pick')}</option>
              {CLIENT_SOURCES.map((value) => (
                <option key={value} value={value}>
                  {sources(value)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <TagInput
          aria-label={add('tags')}
          options={card.tags}
          value={tags}
          onChange={setTags}
          caption={t('tagsCaption')}
          addLabel={add('addTag')}
          newTagLabel={add('newTag')}
          addButtonLabel={add('addTagButton')}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onDone}>
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={!numberOk} loading={update.isPending} loadingLabel={t('saving')}>
            {t('save')}
          </Button>
        </div>
      </div>
    </form>
  )
}

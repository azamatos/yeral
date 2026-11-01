import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { nationalDigits, toE164 } from '@yeral/domain/phone'
import { CLIENT_SOURCES, type ClientSource } from '@yeral/domain/model'
import { PHONE_RULES } from '@yeral/features/auth-by-phone'
import { Button } from '@yeral/ui/button'
import { Field } from '@yeral/ui/field'
import { Input, Textarea } from '@yeral/ui/input'
import { Modal, ModalContent, ModalHeader } from '@yeral/ui/modal'
import { PhoneInput } from '@yeral/ui/phone-input'
import { Select } from '@yeral/ui/select'
import { TagInput } from '@yeral/ui/tag-input'
import { toast } from '@yeral/ui/toast'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'

/**
 * Add a client (B-Clients `modal=add`, book B-33): the number first, with «This number belongs to …» when it's taken;
 * the name, birthday, how they found you, tags and a note for the team, all optional. Save, or Save and book.
 */
export function AddClientModal({
  slug,
  today,
  onSaved,
  onClose,
}: {
  slug: string
  today: string
  /** Saved; `book`: the new booking opens for them. */
  onSaved: (id: string, book: boolean) => void
  onClose: () => void
}) {
  const t = useTranslations('clients.add')
  const sources = useTranslations('clients.sources')
  const sdk = useSdk()
  const errorText = useErrorText()
  const [digits, setDigits] = useState('')
  const [name, setName] = useState('')
  const [birthday, setBirthday] = useState('')
  const [source, setSource] = useState<ClientSource | ''>('')
  const [tags, setTags] = useState<string[]>([])
  const [note, setNote] = useState('')

  const complete = digits.length === PHONE_RULES.maxDigits
  const lookup = useQuery({ ...sdk.clients.lookup(slug, { phone: digits }), enabled: complete })
  const taken = complete ? lookup.data?.items.find((c) => c.phone && nationalDigits(c.phone) === digits) : undefined
  const add = useMutation(sdk.clients.add(slug))
  const ready = complete && !taken

  const save = (book: boolean) =>
    add.mutate(
      {
        phone: toE164(digits),
        tags,
        ...(name.trim() ? { name: name.trim() } : {}),
        ...(birthday ? { birthday } : {}),
        ...(source ? { source } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      },
      {
        onSuccess: ({ id }) => {
          toast(t('saved'))
          onSaved(id, book)
        },
        onError: (error) => toast(errorText(error)),
      },
    )

  return (
    <Modal open onOpenChange={(open) => !open && onClose()}>
      <ModalContent size={480} aria-describedby={undefined} className="gap-4">
        <ModalHeader title={t('heading')} closeLabel={t('close')} />
        <Field
          label={t('phone')}
          error={
            taken ? (
              <>
                {t('taken', { name: taken.name ?? t('unnamed') })}
                {t('takenJoin')}
                <Link to="/w/$slug/clients/$id" params={{ slug, id: taken.id }}>
                  {t('openCard')}
                </Link>
              </>
            ) : undefined
          }
        >
          <PhoneInput {...PHONE_RULES} size={44} value={digits} onValueChange={setDigits} />
        </Field>
        <Field label={t('name')}>
          <Input maxLength={80} autoComplete="off" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('birthday')}>
            <Input type="date" max={today} value={birthday} onChange={(e) => setBirthday(e.target.value)} />
          </Field>
          <Field label={t('source')}>
            <Select value={source} onChange={(e) => setSource(e.target.value as ClientSource | '')}>
              <option value="">{t('pick')}</option>
              {CLIENT_SOURCES.map((value) => (
                <option key={value} value={value}>
                  {sources(value)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <TagInput
          aria-label={t('tags')}
          options={[]}
          value={tags}
          onChange={setTags}
          addLabel={t('addTag')}
          newTagLabel={t('newTag')}
          addButtonLabel={t('addTagButton')}
        />
        <Field label={t('note')}>
          <Textarea value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={!ready} onClick={() => save(true)}>
            {t('saveAndBook')}
          </Button>
          <Button disabled={!ready} loading={add.isPending} loadingLabel={t('saving')} onClick={() => save(false)}>
            {t('save')}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  )
}

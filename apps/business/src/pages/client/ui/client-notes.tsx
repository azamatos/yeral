import { useMutation } from '@tanstack/react-query'
import type { ClientCard } from '@yeral/contract/clients'
import { TEAM_NOTE_MAX } from '@yeral/domain/clients'
import { localOf } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { Checkbox } from '@yeral/ui/checkbox'
import { Field } from '@yeral/ui/field'
import { Textarea } from '@yeral/ui/input'
import { NoteRow } from '@yeral/ui/note-row'
import { toast } from '@yeral/ui/toast'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { notesInOrder, type ClientNote } from '../model/card'
import { CardSection, Caption } from './card-section'

/** Notes (B-Client `composer`, book B-34 step 3): alerts first; anyone who sees the client adds one; only the team reads them. */
export function ClientNotes({ slug, card }: { slug: string; card: ClientCard }) {
  const t = useTranslations('clientCard.notes')
  const sdk = useSdk()
  const errorText = useErrorText()
  const add = useMutation(sdk.clients.addNote(slug))
  const [writing, setWriting] = useState(false)
  const [text, setText] = useState('')
  const [alert, setAlert] = useState(false)
  const notes = notesInOrder(card.notes)

  const close = () => {
    setWriting(false)
    setText('')
    setAlert(false)
  }
  const save = () =>
    add.mutate(
      { id: card.id, text: text.trim(), alert },
      {
        onSuccess: () => {
          toast(t('added'))
          close()
        },
        onError: (error) => toast.error(errorText(error)),
      },
    )

  return (
    <CardSection
      title={t('title')}
      count={notes.length || undefined}
      action={
        !writing && (
          <Button variant="secondary" size="s" onClick={() => setWriting(true)}>
            {t('add')}
          </Button>
        )
      }
    >
      {writing && (
        <div className="flex flex-col gap-2.5">
          <Field label={t('new')}>
            <Textarea
              autoFocus
              maxLength={TEAM_NOTE_MAX}
              placeholder={t('placeholder')}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </Field>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Checkbox label={t('alert')} checked={alert} onChange={(e) => setAlert(e.target.checked)} />
            <div className="flex gap-2">
              <Button variant="tertiary" size="s" onClick={close}>
                {t('cancel')}
              </Button>
              <Button
                variant="secondary"
                size="s"
                disabled={!text.trim()}
                loading={add.isPending}
                loadingLabel={t('saving')}
                onClick={save}
              >
                {t('save')}
              </Button>
            </div>
          </div>
          <Caption>{t('caption')}</Caption>
        </div>
      )}
      {notes.length > 0 ? (
        <div className="flex flex-col">
          {notes.map((note) => (
            <Note key={note.id} note={note} />
          ))}
        </div>
      ) : (
        !writing && <Caption>{t('none')}</Caption>
      )}
    </CardSection>
  )
}

function Note({ note }: { note: ClientNote }) {
  const t = useTranslations('clientCard.notes')
  const fmt = useFmt()
  const date = fmt.dayMonth(localOf(note.at).date)
  const meta = note.by ? t('meta', { by: note.by, date }) : date
  // an alert note is the same row with the warning icon (DS-Lists A10: a row, not a box); its meta says it's shown when booking
  return (
    <NoteRow alert={note.alert} meta={note.alert ? t('metaShown', { meta }) : meta}>
      {note.text}
    </NoteRow>
  )
}

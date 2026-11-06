import { useMutation } from '@tanstack/react-query'
import type { ClientCard } from '@yeral/contract/clients'
import { TEAM_NOTE_MAX } from '@yeral/domain/clients'
import { localOf } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { Checkbox } from '@yeral/ui/checkbox'
import { Field } from '@yeral/ui/field'
import { Textarea } from '@yeral/ui/input'
import { Pill } from '@yeral/ui/pill'
import { toast } from '@yeral/ui/toast'
import { StickyNote, TriangleAlert } from 'lucide-react'
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
        onError: (error) => toast(errorText(error)),
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
  const meta = <Caption>{note.by ? t('meta', { by: note.by, date }) : date}</Caption>
  // an alert note is the same row (B-Client `.note`, COMPONENTS.md ClientNote): the warning icon and the pending-tone
  // «Shown when booking» pill tell it apart; the amber box belongs to the booking drawer
  return (
    <div className="flex items-start gap-3 border-b border-n-200 py-3.5 text-small last:border-b-0">
      {note.alert ? (
        <TriangleAlert aria-hidden className="mt-px size-4.5 flex-none text-st-pending-dot" />
      ) : (
        <StickyNote aria-hidden className="mt-px size-4.5 flex-none text-n-500" />
      )}
      <span className="flex min-w-0 flex-col gap-1 [overflow-wrap:anywhere]">
        <span>{note.text}</span>
        {note.alert ? (
          <span className="flex flex-wrap items-center gap-2">
            {meta}
            <Pill tone="warning" size="s">
              {t('shown')}
            </Pill>
          </span>
        ) : (
          meta
        )}
      </span>
    </div>
  )
}

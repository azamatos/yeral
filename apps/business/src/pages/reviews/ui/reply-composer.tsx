import { REVIEW_REPLY_MAX } from '@yeral/domain/lifecycle'
import { Button } from '@yeral/ui/button'
import { Field } from '@yeral/ui/field'
import { Textarea } from '@yeral/ui/input'
import { useState } from 'react'
import { useTranslations } from 'use-intl'

/**
 * «Your reply as Glow Studio» (B-Reviews → composer): the words up to 500, the counter, Cancel and Post reply (Save
 * when changing a reply). Over the limit the counter turns into the error and the button waits.
 */
export function ReplyComposer({
  business,
  initial,
  placeholder,
  saving,
  onCancel,
  onSubmit,
}: {
  business: string
  initial: string
  placeholder: string
  saving: boolean
  onCancel: () => void
  onSubmit: (text: string) => void
}) {
  const t = useTranslations('reviews.composer')
  const [text, setText] = useState(initial)
  const trimmed = text.trim()
  const tooLong = trimmed.length > REVIEW_REPLY_MAX
  const ready = trimmed.length > 0 && !tooLong && trimmed !== initial

  return (
    <form
      className="flex max-w-[680px] flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (ready) onSubmit(trimmed)
      }}
    >
      <Field
        label={t('label', { business })}
        hint={t('hint')}
        error={tooLong ? t('tooLong', { max: REVIEW_REPLY_MAX }) : undefined}
        counter={{ value: trimmed.length, max: REVIEW_REPLY_MAX, text: t('counter', { count: trimmed.length, max: REVIEW_REPLY_MAX }) }}
      >
        <Textarea autoFocus className="h-28" placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="s" onClick={onCancel}>
          {t('cancel')}
        </Button>
        <Button type="submit" variant="primary" size="s" disabled={!ready} loading={saving}>
          {initial ? t('save') : t('post')}
        </Button>
      </div>
    </form>
  )
}

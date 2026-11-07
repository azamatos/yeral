import { useMutation } from '@tanstack/react-query'
import { blockOverBookingsDetailsSchema, type BlockOverBookingsDetails } from '@yeral/contract/errors'
import { BLOCK_REPEAT_DAYS } from '@yeral/domain/hours'
import { addDays, localOf } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { isApiError } from '@yeral/sdk'
import { Button } from '@yeral/ui/button'
import { ChipRadioGroup } from '@yeral/ui/chip'
import { cn } from '@yeral/ui/cn'
import { DatePicker } from '@yeral/ui/date-picker'
import { Field, FieldMessage, FieldScope } from '@yeral/ui/field'
import { Input } from '@yeral/ui/input'
import { Modal, ModalActions, ModalClose, ModalContent, ModalHeader } from '@yeral/ui/modal'
import { Segmented, SegmentedItem } from '@yeral/ui/segmented'
import { Select } from '@yeral/ui/select'
import { toast } from '@yeral/ui/toast'
import { useId, useState } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useDatePickerWords, useErrorText } from '@/shared/i18n'
import {
  BLOCK_KINDS,
  BLOCK_REPEAT_OPTIONS,
  blockBody,
  blockFormOf,
  blockProblems,
  canSend,
  nextSlot,
  occurrences,
  OTHER_MAX,
  timeOptions,
  withDate,
  withStart,
  type BlockForm,
} from '../model/block-time'

export type BlockSlot = { staffId: string; date: string; start: number }
/** A booking the calendar has on screen: names the one in the way («15:30–16:30 Ejegyz T. · Women’s haircut»). */
export type KnownBooking = { code: string; client: { name: string | null }; items: readonly { service: string }[] }

const LABEL = 'text-dense font-semibold text-n-900'

/**
 * «Block time» (B-Calendar `panel=block-time`, B-Mobile 2c, book B-18 step 3): the person (the slot's, picked among
 * those the reader sees; a specialist their own, read-only), the day and From–To by the quarter hour, why as chips
 * (Other in a few words), a repeat every day or every week up to a day with its caption («Every Wednesday from 14
 * October to 30 November · 7 times»). Over a booking the api refuses (`block_over_bookings`): the first one in the way
 * is named under the times with «Open the booking». Saved: the toast «Time blocked: …» and the calendar's Closed layer.
 */
export function BlockTimeModal({
  slug,
  slot,
  people,
  specialist,
  hours,
  today,
  now,
  bookings = [],
  onOpenBooking,
  onClose,
}: {
  slug: string
  slot: BlockSlot
  /** The people whose column the reader sees, in the grid's order. */
  people: readonly { staffId: string; name: string }[]
  /** A specialist blocks only their own time: the person is fixed. */
  specialist: boolean
  /** The grid's hours: what From and To offer. */
  hours: { from: number; to: number }
  today: string
  now: number
  bookings?: readonly KnownBooking[]
  onOpenBooking: (code: string) => void
  onClose: () => void
}) {
  const t = useTranslations('blockTime')
  const fmt = useFmt()
  const sdk = useSdk()
  const words = useDatePickerWords()
  const errorText = useErrorText()
  const id = useId()
  const [form, setForm] = useState<BlockForm>(() => blockFormOf(slot, hours.to * 60))
  // the booking the api found in the way of the last try, until the time or the person changes
  const [hit, setHit] = useState<BlockOverBookingsDetails['bookings'][number] | null>(null)
  const block = useMutation(sdk.calendar.block(slug))

  const change = (next: BlockForm) => {
    setForm(next)
    // the refusal stands until the time, the person or the repeat changes: another reason wouldn't move the booking
    if (hit && (['staffId', 'date', 'start', 'end', 'repeat', 'until'] as const).some((k) => next[k] !== form[k])) setHit(null)
  }
  const problems = blockProblems(form, now)
  const options = timeOptions(hours.from, hours.to)
  const person = people.find((p) => p.staffId === form.staffId)
  const kindLabel = (kind: BlockForm['kind']) => (kind === 'other' ? form.text.trim() : kind ? t(`kinds.${kind}`) : '')
  const send = async () => {
    if (!canSend(problems) || block.isPending) return
    try {
      await block.mutateAsync(blockBody(form))
      toast(
        t('blocked', {
          person: person?.name ?? '',
          time: fmt.timeRange(form.start, form.end),
          reason: kindLabel(form.kind),
          repeat: form.repeat,
          until: fmt.dayMonth(form.until),
        }),
      )
      onClose()
    } catch (error) {
      const details = isApiError(error, 'block_over_bookings') ? blockOverBookingsDetailsSchema.safeParse(error.details) : null
      const first = details?.success ? details.data.bookings[0] : undefined
      if (first) setHit(first)
      else toast.error(errorText(error))
    }
  }

  // what the times' line says: the order, the time gone by, or the booking in the way (with who, when it's on screen)
  const known = hit ? bookings.find((b) => b.code === hit.code) : undefined
  const hitTime = hit ? fmt.timeRange(hit.start, hit.end) : ''
  const hitWhat = hit
    ? known
      ? t('hitWho', { time: hitTime, client: known.client.name ?? t('client'), service: known.items[0]?.service ?? '' })
      : hitTime
    : ''
  const timeError =
    problems.time === 'order'
      ? t('order')
      : problems.time === 'past'
        ? t('past', { time: fmt.time(nextSlot(localOf(now).min)) })
        : hit
          ? t('hit', { what: hit.date === form.date ? hitWhat : t('hitOn', { date: fmt.shortDate(hit.date), what: hitWhat }) })
          : null
  const times = occurrences(form)

  return (
    <Modal open onOpenChange={(open) => !open && !block.isPending && onClose()}>
      <ModalContent size={400}>
        <ModalHeader title={t('title')} closeLabel={t('close')} />
        <div className="flex flex-col gap-4">
          {specialist ? (
            <Field label={t('person')} hint={t('ownOnly')}>
              <Input readOnly size="m" value={person?.name ?? ''} className="bg-n-50" />
            </Field>
          ) : (
            <Field label={t('person')}>
              <Select
                value={form.staffId}
                onValueChange={(staffId) => change({ ...form, staffId })}
                options={people.map((p) => ({ value: p.staffId, label: p.name }))}
                closeLabel={t('close')}
              />
            </Field>
          )}
          <div role="group" aria-labelledby={`${id}-when`} className="flex flex-col gap-1.5">
            <span id={`${id}-when`} className={LABEL}>
              {t('when')}
            </span>
            {/* the date is named by the group («Date and time, Wednesday, 15 October») and described by the times' message */}
            <FieldScope
              value={{
                id: `${id}-date`,
                labelId: `${id}-when`,
                describedBy: timeError ? `${id}-time` : undefined,
                invalid: !!timeError,
                status: timeError ? 'error' : undefined,
                disabled: false,
              }}
            >
              <DatePicker
                copy={{ ...words, placeholder: t('date') }}
                today={today}
                min={today}
                value={form.date}
                onValueChange={(date) => change(withDate(form, date))}
              />
            </FieldScope>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
              <Select
                aria-label={t('from')}
                aria-describedby={timeError ? `${id}-time` : undefined}
                value={String(form.start)}
                invalid={!!timeError}
                listWidth="content"
                closeLabel={t('close')}
                onValueChange={(v) => change(withStart(form, Number(v)))}
                options={options.starts.map((m) => ({ value: String(m), label: fmt.time(m) }))}
              />
              <span aria-hidden className="text-n-600">
                {t('dash')}
              </span>
              <Select
                aria-label={t('to')}
                aria-describedby={timeError ? `${id}-time` : undefined}
                value={String(form.end)}
                invalid={!!timeError}
                listWidth="content"
                closeLabel={t('close')}
                onValueChange={(v) => change({ ...form, end: Number(v) })}
                options={options.ends.map((m) => ({ value: String(m), label: fmt.time(m) }))}
              />
            </div>
            {timeError && (
              <FieldMessage id={`${id}-time`}>
                {timeError}
                {hit && (
                  <>
                    {' '}
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        onOpenBooking(hit.code)
                      }}
                      className="cursor-pointer rounded-xs border-0 bg-transparent p-0 text-dense font-semibold text-a-600 hover:underline focus-visible:shadow-focus focus-visible:outline-none"
                    >
                      {t('openBooking')}
                    </button>
                  </>
                )}
              </FieldMessage>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <span id={`${id}-reason`} className={LABEL}>
              {t('reason')}
            </span>
            <ChipRadioGroup
              aria-labelledby={`${id}-reason`}
              value={form.kind ?? ''}
              onValueChange={(kind) => change({ ...form, kind: kind as BlockForm['kind'] })}
              className="max-sm:[&>*]:h-11"
              options={BLOCK_KINDS.map((kind) => ({ value: kind, label: t(`kinds.${kind}`) }))}
            />
            {form.kind === 'other' && (
              <Input
                aria-label={t('otherLabel')}
                placeholder={t('otherPlaceholder')}
                maxLength={OTHER_MAX}
                value={form.text}
                onChange={(e) => change({ ...form, text: e.target.value })}
              />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <span id={`${id}-repeat`} className={LABEL}>
              {t('repeat')}
            </span>
            <Segmented
              aria-labelledby={`${id}-repeat`}
              value={form.repeat}
              onValueChange={(repeat) => change({ ...form, repeat: repeat as BlockForm['repeat'] })}
              className="self-start max-sm:w-full max-sm:self-stretch"
            >
              {BLOCK_REPEAT_OPTIONS.map((repeat) => (
                <SegmentedItem key={repeat} value={repeat} className="max-sm:h-9.5 max-sm:flex-1">
                  {t(`repeats.${repeat}`)}
                </SegmentedItem>
              ))}
            </Segmented>
            {form.repeat !== 'none' && (
              <Field
                label={t('until')}
                className="pt-1.5"
                error={problems.until && t('untilBad')}
                hint={
                  !problems.until &&
                  t('caption', {
                    repeat: form.repeat,
                    weekday: fmt.weekday(form.date),
                    from: fmt.dayMonth(form.date),
                    to: fmt.dayMonth(form.until),
                    n: times,
                  })
                }
              >
                <DatePicker
                  copy={{ ...words, placeholder: t('date') }}
                  today={today}
                  min={addDays(form.date, 1)}
                  max={addDays(form.date, BLOCK_REPEAT_DAYS)}
                  value={form.until}
                  onValueChange={(until) => change({ ...form, until })}
                />
              </Field>
            )}
          </div>
        </div>
        <ModalActions>
          <ModalClose asChild>
            <Button variant="secondary" disabled={block.isPending}>
              {t('cancel')}
            </Button>
          </ModalClose>
          <Button
            variant="primary"
            disabled={!canSend(problems) || !!hit}
            loading={block.isPending}
            onClick={() => void send()}
            className={cn(block.isPending && 'pointer-events-none')}
          >
            {t('submit')}
          </Button>
        </ModalActions>
      </ModalContent>
    </Modal>
  )
}

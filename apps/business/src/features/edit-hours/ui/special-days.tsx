import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingsAffectedDetailsSchema, type BookingsAffectedDetails } from '@yeral/contract/errors'
import { HOURS_STEP, type WeekdayHours } from '@yeral/contract/settings'
import { parseYmd, today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { isApiError } from '@yeral/sdk'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { Checkbox, Radio } from '@yeral/ui/checkbox'
import { DatePicker } from '@yeral/ui/date-picker'
import { Field } from '@yeral/ui/field'
import { Input } from '@yeral/ui/input'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@yeral/ui/menu'
import { Modal, ModalActions, ModalContent, ModalHeader } from '@yeral/ui/modal'
import { OptionCard, OptionCardGroup } from '@yeral/ui/option-card'
import { SettingsSection, SettingsSectionTitle } from '@yeral/ui/settings-layout'
import { TimeRangeField } from '@yeral/ui/time-range'
import { toast } from '@yeral/ui/toast'
import { Calendar, CircleAlert, Ellipsis, Pencil, Plus, Trash2 } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useDatePickerWords, useDayName, useErrorText } from '@/shared/i18n'
import {
  dateProblem,
  dayOf,
  draftOf,
  nightProblem,
  overlapOf,
  sameDay,
  SPECIAL_DAY_NAME_MAX,
  type SpecialDay,
  type SpecialDayDraft,
} from '../model/special-days'
import { HoursAffectedBookings, useAffectedCount, useJoin, type AffectedChoice } from './affected-bookings'

type Saved = { hours: (WeekdayHours | null)[]; specialDays: SpecialDay[] }

/** «2 November 2026», «1 January» (yearly), «21–22 March», «28 December 2026 – 3 January 2027». */
function useDates() {
  const t = useTranslations('specialDays')
  const fmt = useFmt()
  const year = (d: string) => String(parseYmd(d).getUTCFullYear())
  return (d: Pick<SpecialDay, 'from' | 'to' | 'yearly'>) => {
    const one = (date: string) => (d.yearly ? fmt.dayMonth(date) : t('withYear', { date: fmt.dayMonth(date), year: year(date) }))
    if (d.from === d.to) return one(d.from)
    if (d.from.slice(0, 7) === d.to.slice(0, 7)) return t('sameMonth', { from: parseYmd(d.from).getUTCDate(), to: one(d.to) })
    if (d.yearly || year(d.from) === year(d.to)) return t('range', { from: fmt.dayMonth(d.from), to: one(d.to) })
    return t('range', { from: one(d.from), to: one(d.to) })
  }
}

/**
 * «Special days» (B-Settings, design §8 «Aýratyn günler», §28.5, book B-40): holidays and unusual days, each a row with
 * its dates, «Every year» or «One-off», and «Closed» or its hours, with Edit and Delete. Each one saves directly, with
 * the saved week (not the week being edited above it), and a delete can be undone.
 */
export function SpecialDays({ slug, saved }: { slug: string; saved: Saved }) {
  const t = useTranslations('specialDays')
  const fmt = useFmt()
  const sdk = useSdk()
  const errorText = useErrorText()
  const dates = useDates()
  const count = useAffectedCount()
  const queryClient = useQueryClient()
  const update = useMutation(sdk.settings.updateHours(slug))
  const titleId = useId()
  // the day being edited, a new one (null), or no modal (undefined); a day is known by its fields (the list has no ids)
  const [editing, setEditing] = useState<SpecialDay | null | undefined>(undefined)
  // a delete the api sent back: the bookings it leaves outside the week, waiting for Keep or Cancel
  const [deleting, setDeleting] = useState<{ day: SpecialDay; details: BookingsAffectedDetails } | null>(null)
  const busy = update.isPending

  const cancelledText = (cancelled: number, counts?: BookingsAffectedDetails['counts']) =>
    counts && cancelled === counts.bookings + counts.requests ? count(counts, 'and') : count({ bookings: cancelled, requests: 0 }, 'and')

  // Undo saves what's there now with the day back in its place: a change since stays, a day the api dropped meanwhile too
  const undo = async (gone: SpecialDay, at: number) => {
    try {
      const now = await queryClient.fetchQuery({ ...sdk.settings.hours(slug), staleTime: 0 })
      const list = [...now.specialDays]
      list.splice(Math.min(at, list.length), 0, gone)
      await update.mutateAsync({ hours: now.hours, specialDays: list })
    } catch (error) {
      toast(errorText(error))
    }
  }
  const remove = async (gone: SpecialDay, affected?: AffectedChoice) => {
    const at = saved.specialDays.findIndex((d) => sameDay(d, gone))
    try {
      const result = await update.mutateAsync({
        hours: saved.hours,
        specialDays: saved.specialDays.filter((d) => !sameDay(d, gone)),
        ...(affected ? { affected } : {}),
      })
      const counts = deleting?.details.counts
      setDeleting(null)
      toast(
        result.cancelled > 0
          ? t('deletedCancelled', { name: gone.name, what: cancelledText(result.cancelled, counts) })
          : t('deleted', { name: gone.name }),
        { action: { label: t('undo'), onClick: () => void undo(gone, at) } },
      )
    } catch (error) {
      const details = isApiError(error, 'bookings_affected') ? bookingsAffectedDetailsSchema.safeParse(error.details) : null
      if (details?.success) setDeleting({ day: gone, details: details.data })
      else toast(errorText(error))
    }
  }

  return (
    <SettingsSection aria-labelledby={titleId}>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <SettingsSectionTitle id={titleId} caption={t('caption')} className="min-w-0 flex-[1_1_280px]">
          {t('title')}
        </SettingsSectionTitle>
        <Button size="s" disabled={busy} onClick={() => setEditing(null)}>
          <Plus strokeWidth={2} />
          {t('add')}
        </Button>
      </div>
      <div className="flex flex-col border-t border-n-200">
        {saved.specialDays.length === 0 && <p className="m-0 border-b border-n-200 py-5 text-dense text-n-600">{t('empty')}</p>}
        {saved.specialDays.map((d) => (
          <div key={`${d.name}-${d.from}-${d.to}`} className="flex min-h-16 items-center gap-3.5 border-b border-n-200 py-2.5">
            <span aria-hidden className="flex size-10 flex-none items-center justify-center rounded-[10px] bg-group text-n-600">
              <Calendar className="size-5" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-body leading-[22px] font-semibold">{d.name}</span>
              <span className="text-dense text-n-600">{dates(d)}</span>
            </span>
            <span className="flex flex-wrap justify-end gap-1.5">
              <Tag>{d.yearly ? t('yearly') : t('oneOff')}</Tag>
              {d.hours ? <Tag tone="accent">{fmt.timeRange(d.hours.open, d.hours.close)}</Tag> : <Tag tone="slate">{t('closed')}</Tag>}
            </span>
            <Menu>
              <MenuTrigger asChild>
                <Button variant="ghost" size="s" iconOnly disabled={busy} aria-label={t('actions', { name: d.name })}>
                  <Ellipsis />
                </Button>
              </MenuTrigger>
              <MenuContent>
                <MenuItem onSelect={() => setEditing(d)}>
                  <Pencil aria-hidden className="size-4.5" />
                  {t('edit')}
                </MenuItem>
                <MenuItem onSelect={() => void remove(d)} className="text-danger-ink">
                  <Trash2 aria-hidden className="size-4.5" />
                  {t('delete')}
                </MenuItem>
              </MenuContent>
            </Menu>
          </div>
        ))}
      </div>
      <Modal open={editing !== undefined} onOpenChange={(open) => !open && !busy && setEditing(undefined)}>
        {editing !== undefined && (
          <SpecialDayModal
            key={editing ? `${editing.name}-${editing.from}-${editing.to}` : 'new'}
            original={editing}
            saved={saved}
            saving={busy}
            onSave={async (specialDays, affected, counts) => {
              const result = await update.mutateAsync({ hours: saved.hours, specialDays, ...(affected ? { affected } : {}) })
              setEditing(undefined)
              const done = editing === null ? t('added') : t('saved')
              toast(result.cancelled > 0 ? t('savedCancelled', { done, what: cancelledText(result.cancelled, counts) }) : done)
            }}
            onClose={() => setEditing(undefined)}
          />
        )}
      </Modal>
      <HoursAffectedBookings
        details={deleting?.details ?? null}
        lead={deleting ? t('deleteLead', { name: deleting.day.name }) : ''}
        saving={busy}
        onSave={(choice) => deleting && void remove(deleting.day, choice)}
        onClose={() => setDeleting(null)}
      />
    </SettingsSection>
  )
}

function Tag({ tone, children }: { tone?: 'accent' | 'slate'; children: ReactNode }) {
  const tones = {
    none: 'border-n-200 bg-group text-n-600',
    accent: 'border-a-line bg-a-50 text-a-600',
    slate: 'border-st-cancelled-line bg-st-cancelled-bg text-st-cancelled-ink',
  }
  return (
    <span
      className={`inline-flex h-6 items-center rounded-pill border px-2 text-micro font-semibold whitespace-nowrap ${tones[tone ?? 'none']}`}
    >
      {children}
    </span>
  )
}

/**
 * «Add a special day» / «Edit special day» (B-Settings `exceptionModal`): the name clients see if a booking is
 * cancelled for it, one day or several, every year or not, closed or other hours (past midnight checked against the
 * next day's opening), the day it overlaps and which one applies there. Bookings on those days come back from the api
 * first: keep them, or cancel them with 3 other times, then it saves again with the choice.
 */
function SpecialDayModal({
  original,
  saved,
  saving,
  onSave,
  onClose,
}: {
  /** The day being edited as it was saved; null for a new one. */
  original: SpecialDay | null
  saved: Saved
  saving: boolean
  onSave: (specialDays: SpecialDay[], affected?: AffectedChoice, counts?: BookingsAffectedDetails['counts']) => Promise<void>
  onClose: () => void
}) {
  const t = useTranslations('specialDays')
  const h = useTranslations('hours')
  const dayName = useDayName()
  const count = useAffectedCount()
  const join = useJoin()
  const errorText = useErrorText()
  const pickerWords = useDatePickerWords()
  const datesOf = useDates()
  const ids = useId()
  // the business day it opened on: a day ending today isn't past yet
  const [todayDate] = useState(() => today(Date.now()))
  const [draft, setDraft] = useState<SpecialDayDraft>(() => draftOf(original ?? undefined))
  const [conflict, setConflict] = useState<BookingsAffectedDetails | null>(null)
  const [choice, setChoice] = useState<AffectedChoice>('keep')
  const set = (patch: Partial<SpecialDayDraft>) => {
    setDraft((d) => ({ ...d, ...patch }))
    // a changed day asks the api again
    setConflict(null)
  }

  // found again in the list as it is now (a refetch may have moved or dropped others)
  const others = saved.specialDays.filter((d) => !(original && sameDay(d, original)))
  const day = dayOf(draft)
  const dates = day && dateProblem(day, todayDate)
  const night = day && !dates ? nightProblem(day, saved.hours, others) : null
  const overlap = day && !dates ? overlapOf(day, others) : null
  const invalid = !draft.name.trim() || draft.name.trim().length > SPECIAL_DAY_NAME_MAX || !day || !!dates || !!night
  const nightText =
    night &&
    (night.kind === 'same'
      ? h('problems.sameTime')
      : night.kind === 'next'
        ? h('problems.intoNextDay', { next: dayName(night.weekday) })
        : t(night.kind === 'before' || night.kind === 'yearlyBefore' ? 'nightBefore' : 'nightYearly'))

  const save = async () => {
    if (!day || invalid) return
    // an edited day keeps its place; a new one goes last, so in a full tie the existing day applies (`findException`)
    const kept = original !== null && saved.specialDays.some((d) => sameDay(d, original))
    const list = kept ? saved.specialDays.map((d) => (sameDay(d, original) ? day : d)) : [...others, day]
    try {
      await onSave(list, conflict ? choice : undefined, conflict?.counts)
    } catch (error) {
      const details = isApiError(error, 'bookings_affected') ? bookingsAffectedDetailsSchema.safeParse(error.details) : null
      if (details?.success) {
        setConflict(details.data)
        setChoice('keep')
      } else toast(errorText(error))
    }
  }

  const conflictText =
    conflict &&
    t(day?.hours ? 'conflictHours' : draft.multi ? 'conflictDays' : 'conflictDay', {
      what: count(conflict.counts, 'and'),
      n: conflict.count,
      who: join(
        conflict.byStaff.map((s) => t('perStaff', { name: s.name, n: s.count })),
        'list',
      ),
    })

  return (
    <ModalContent size={560}>
      <ModalHeader title={original === null ? t('addTitle') : t('editTitle')} closeLabel={t('close')} />
      <Field label={t('name')} hint={t('nameHint')}>
        <Input
          value={draft.name}
          placeholder={t('namePlaceholder')}
          maxLength={SPECIAL_DAY_NAME_MAX}
          onChange={(e) => set({ name: e.target.value })}
        />
      </Field>
      <fieldset className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0">
        <legend className="mb-1.5 p-0 text-dense font-semibold text-n-900">{t('howMany')}</legend>
        <div className="flex flex-wrap gap-x-6">
          <Radio
            name={`${ids}-len`}
            label={t('oneDay')}
            checked={!draft.multi}
            onChange={() => set({ multi: false })}
            className="min-h-11"
          />
          <Radio
            name={`${ids}-len`}
            label={t('severalDays')}
            checked={draft.multi}
            onChange={() => set({ multi: true })}
            className="min-h-11"
          />
        </div>
      </fieldset>
      {/* the month (rule 10a: react-day-picker): one day, or a first and a last day; a one-off can't be in the past */}
      {draft.multi ? (
        <Field label={t('days')} error={dates && t(`dates.${dates}`)} className="max-w-80">
          <DatePicker
            mode="range"
            copy={{ ...pickerWords, range: ({ from, to }) => datesOf({ from, to, yearly: draft.yearly }) }}
            today={todayDate}
            min={draft.yearly ? undefined : todayDate}
            value={draft.start && draft.end ? { from: draft.start, to: draft.end } : null}
            onValueChange={({ from, to }) => set({ start: from, end: to })}
          />
        </Field>
      ) : (
        <Field label={t('date')} error={dates && t(`dates.${dates}`)} className="max-w-60">
          <DatePicker
            copy={{ ...pickerWords, value: (date) => datesOf({ from: date, to: date, yearly: draft.yearly }) }}
            today={todayDate}
            min={draft.yearly ? undefined : todayDate}
            value={draft.date || null}
            onValueChange={(date) => set({ date })}
          />
        </Field>
      )}
      <Checkbox
        label={t('yearlyLabel')}
        checked={draft.yearly}
        onChange={(e) => set({ yearly: e.target.checked })}
        className="min-h-11 self-start"
      />
      <fieldset className="m-0 flex min-w-0 flex-col gap-1.5 border-0 p-0">
        <legend className="mb-1.5 p-0 text-dense font-semibold text-n-900">{draft.multi ? t('onThoseDays') : t('thatDay')}</legend>
        <div className="flex flex-wrap gap-x-6">
          <Radio
            name={`${ids}-kind`}
            label={t('closed')}
            checked={draft.closed}
            onChange={() => set({ closed: true })}
            className="min-h-11"
          />
          <Radio
            name={`${ids}-kind`}
            label={t('otherHours')}
            checked={!draft.closed}
            onChange={() => set({ closed: false })}
            className="min-h-11"
          />
        </div>
        {!draft.closed && (
          <TimeRangeField
            value={draft.hours}
            onChange={(hours) => set({ hours })}
            fromLabel={t('opens')}
            toLabel={t('closes')}
            nextDay={(time) => h('nextDay', { time })}
            step={HOURS_STEP}
            error={nightText || undefined}
          />
        )}
      </fieldset>
      {overlap && (
        <Callout tone="warning" icon={<CircleAlert />} title={t('overlap', { name: overlap.name, winner: overlap.winner })} role="status">
          {t('overlapRule')}
        </Callout>
      )}
      {conflict && (
        <div role="group" aria-labelledby={`${ids}-cf`} className="flex flex-col gap-2">
          <span id={`${ids}-cf`} className="text-dense font-semibold text-st-pending-ink">
            {conflictText}
          </span>
          <OptionCardGroup
            value={choice}
            onValueChange={(v) => setChoice(v as AffectedChoice)}
            aria-labelledby={`${ids}-cf`}
            className="gap-2"
          >
            <OptionCard
              value="keep"
              indicator="start"
              title={t('keep')}
              caption={t(day?.hours ? 'keepHours' : draft.multi ? 'keepClosedDays' : 'keepClosedDay')}
            />
            <OptionCard value="cancel" indicator="start" title={t('cancel')} caption={t('cancelCaption')} />
          </OptionCardGroup>
        </div>
      )}
      <ModalActions>
        <Button variant="secondary" disabled={saving} onClick={onClose}>
          {t('back')}
        </Button>
        <Button variant="primary" disabled={invalid} loading={saving} loadingLabel={t('saving')} onClick={() => void save()}>
          {original === null ? t('addCta') : t('saveCta')}
        </Button>
      </ModalActions>
    </ModalContent>
  )
}

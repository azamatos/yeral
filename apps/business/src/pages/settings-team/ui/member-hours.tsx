import { useMutation, useQueryClient } from '@tanstack/react-query'
import { bookingsAffectedDetailsSchema, type BookingsAffectedDetails } from '@yeral/contract/errors'
import type { WeekdayHours } from '@yeral/contract/settings'
import type { StaffScheduleView, TeamMember } from '@yeral/contract/team'
import { HOURS_STEP } from '@yeral/contract/settings'
import { addDays, diffDays, today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { isApiError } from '@yeral/sdk'
import { Button } from '@yeral/ui/button'
import { Checkbox } from '@yeral/ui/checkbox'
import { DatePicker } from '@yeral/ui/date-picker'
import { Field } from '@yeral/ui/field'
import { Input } from '@yeral/ui/input'
import { Segmented, SegmentedItem } from '@yeral/ui/segmented'
import { toast } from '@yeral/ui/toast'
import { CalendarOff, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslations } from 'use-intl'
import { HoursAffectedBookings, HoursRow, type AffectedChoice } from '@/features/edit-hours'
import { useSdk } from '@/shared/api'
import { DAY_OFF_NOTE_MAX } from '@/shared/config'
import { useDatePickerWords, useDateSpan, useDayName, useErrorText } from '@/shared/i18n'
import { dayHours, dayProblem, switchShift, type ShiftForm } from '../model/shift'

type Business = readonly (WeekdayHours | null)[]

/**
 * The staff drawer's working hours (B7-Hours · B1.2, book B-47): Segmented «Business hours · Own shift». Business
 * hours has nothing to set: the days read as text. Own shift starts from a copy of the business hours, a row per day
 * (`HoursRow`, the drawer's narrow layout) with the business window as a faint line under it — within the business
 * hours: when the business is closed, a shift doesn't open bookings — and a break as the gap between two times.
 * Saved with the drawer's Save. The administrator reads it.
 */
export function ShiftEditor({
  form,
  saved,
  business,
  businessName,
  owner,
  name,
  onChange,
}: {
  form: ShiftForm
  /** The week as saved: back on «Own shift», a saved own shift comes back as it was. */
  saved: ShiftForm
  business: Business
  businessName: string
  owner: boolean
  name: string
  onChange: (form: ShiftForm) => void
}) {
  const t = useTranslations('settings.team.hours')
  const h = useTranslations('hours')
  const fmt = useFmt()
  const dayName = useDayName()
  const id = useId()
  const setDay = (i: number, patch: Partial<ShiftForm['days'][number]>) =>
    onChange({ ...form, days: form.days.map((d, j) => (j === i ? { ...d, ...patch } : d)) })
  const editing = owner && form.own
  // a day as text («09:00–20:00 · break 13:00–13:40», «Day off», «Closed»): business hours, and the administrator's view
  const text = (i: number) => {
    const hours = dayHours(form, i, business)
    const d = form.days[i]!
    if (!hours) return business[i] ? t('dayOff') : h('closed')
    return [fmt.timeRange(hours.open, hours.close), d.break ? t('breakRo', { time: fmt.timeRange(d.break.start, d.break.end) }) : '']
      .filter(Boolean)
      .join(' · ')
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5">
        <span id={`${id}-mode`} className="text-dense font-semibold text-n-900">
          {t('working')}
        </span>
        {owner ? (
          <Segmented
            value={form.own ? 'own' : 'business'}
            onValueChange={(v) => v && onChange(v === 'own' && saved.own ? saved : switchShift(form, v === 'own', business))}
            aria-labelledby={`${id}-mode`}
          >
            <SegmentedItem value="business">{t('business')}</SegmentedItem>
            <SegmentedItem value="own">{t('own')}</SegmentedItem>
          </Segmented>
        ) : (
          <span className="text-body font-semibold text-n-900">{form.own ? t('own') : t('business')}</span>
        )}
      </div>
      {editing ? (
        <div className="flex flex-col divide-y divide-n-100 border-t border-n-200">
          {form.days.map((d, i) => {
            const day = dayName(i)
            const b = business[i]
            const problem = dayProblem(form, i, business)
            return (
              <div key={i} role="group" aria-label={day}>
                <HoursRow
                  narrow
                  name={day}
                  // a weekday the business is closed opens no bookings: it can be turned off, not on
                  switch={{
                    checked: d.works,
                    label: t('worksLabel', { day }),
                    disabled: !b && !d.works,
                    onChange: (works) => setDay(i, { works }),
                  }}
                  hours={d.works ? d.hours : null}
                  break={d.break}
                  onChange={(next) => setDay(i, { hours: next.hours, break: next.break })}
                  closedText={b ? t('dayOff') : h('closed')}
                  note={b ? t('window', { business: businessName, hours: fmt.timeRange(b.open, b.close) }) : undefined}
                  error={problem && t(`problems.${problem}`)}
                  step={HOURS_STEP}
                  labels={{
                    opens: t('starts', { day }),
                    closes: t('ends', { day }),
                    secondOpens: t('secondStarts', { day }),
                    secondCloses: t('secondEnds', { day }),
                    addBreak: h('addBreak', { day }),
                    removeBreak: (range) => h('removeBreakRange', { day, range }),
                  }}
                  nextDay={(time) => h('nextDay', { time })}
                />
              </div>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col border-t border-n-200">
          {form.days.map((_, i) => (
            <div key={i} className="flex justify-between gap-3 border-b border-n-200 py-2.5 text-small">
              <span>{dayName(i)}</span>
              <span className="text-right">{text(i)}</span>
            </div>
          ))}
        </div>
      )}
      <p className="m-0 -mt-2 text-dense text-n-600">
        {owner && !form.own
          ? t('businessText', { name, business: businessName })
          : form.own
            ? t('ownCaption')
            : t('businessCaption', { name })}
      </p>
    </div>
  )
}

/** A day off as the list shows it: «9–13 November 2026», «5 days · Every year · Family trip». */
function useOffLine() {
  const t = useTranslations('settings.team.hours')
  const span = useDateSpan()
  return (d: StaffScheduleView['daysOff'][number]) => ({
    text: span(d.from, d.to, { year: !d.yearly }),
    sub: [t('days', { n: diffDays(d.to, d.from) + 1 }), d.yearly ? t('everyYear') : '', d.name === t('defaultName') ? '' : d.name]
      .filter(Boolean)
      .join(' · '),
  })
}

/**
 * «Time off» (B-Team, §28.4: time off that can repeat every year): the person's days off, each removed at once with
 * Undo; «Add time off» with From, To (optional), Repeat every year and a note only the team sees. Saved at once beside
 * the week as it is saved; over bookings it asks Keep them or Cancel and offer 3 other times. The administrator reads it.
 */
export type OffDraft = { from: string; to: string; yearly: boolean; note: string }

export function TimeOff({
  slug,
  member: m,
  schedule,
  owner,
  draft,
  onDraft,
  locked,
  onBusy,
}: {
  slug: string
  member: TeamMember
  schedule: StaffScheduleView
  owner: boolean
  /** The form being filled, kept by the drawer so a tab switch doesn't lose it. */
  draft: OffDraft | null
  onDraft: (draft: OffDraft | null) => void
  /** The drawer's own Save is running: the schedule is being written, wait for it. */
  locked: boolean
  /** A time-off save is running: the drawer neither closes nor saves meanwhile. */
  onBusy: (busy: boolean) => void
}) {
  const t = useTranslations('settings.team.hours')
  const sdk = useSdk()
  const errorText = useErrorText()
  const words = useDatePickerWords()
  const span = useDateSpan()
  const line = useOffLine()
  const id = useId()
  const queryClient = useQueryClient()
  const save = useMutation(sdk.team.updateSchedule(slug, m.id))
  const [now] = useState(() => Date.now())
  const todayDate = today(now)
  const setDraft = onDraft
  const busy = save.isPending || locked
  const [asked, setAsked] = useState<{ details: BookingsAffectedDetails; daysOff: StaffScheduleView['daysOff']; range: string } | null>(
    null,
  )
  // the api's rules for a day off: it ends on or after it starts, and lasts a year at most
  const dates = !draft?.from || !draft.to ? null : draft.to < draft.from ? 'order' : draft.to > addDays(draft.from, 365) ? 'long' : null

  // the week as saved (a change still in the drawer goes with its Save), and these days off
  const send = async (daysOff: StaffScheduleView['daysOff'], affected?: AffectedChoice, week: StaffScheduleView = schedule) => {
    onBusy(true)
    try {
      return await save.mutateAsync({ shift: week.shift, breaks: week.breaks, daysOff, ...(affected ? { affected } : {}) })
    } finally {
      onBusy(false)
    }
  }

  const ask = (error: unknown, daysOff: StaffScheduleView['daysOff'], range: string) => {
    const listed = isApiError(error, 'bookings_affected') && bookingsAffectedDetailsSchema.safeParse(error.details)
    if (listed && listed.success) setAsked({ details: listed.data, daysOff, range })
    else toast(errorText(error))
  }

  const add = async (affected?: AffectedChoice) => {
    const pending = asked
    if (!draft && !pending) return
    const daysOff = pending?.daysOff ?? [
      ...schedule.daysOff,
      { name: draft!.note.trim() || t('defaultName'), from: draft!.from, to: draft!.to || draft!.from, yearly: draft!.yearly },
    ]
    const added = daysOff[daysOff.length - 1]!
    const range = span(added.from, added.to, { year: !added.yearly })
    try {
      const result = await send(daysOff, affected)
      setAsked(null)
      setDraft(null)
      toast(
        [t('added', { range }), added.yearly ? t('addedYearly') : '', result.cancelled ? t('cancelledN', { n: result.cancelled }) : '']
          .filter(Boolean)
          .join(' · '),
      )
    } catch (error) {
      ask(error, daysOff, range)
    }
  }

  // Undo puts the day back into the schedule as it stands then (read again), not as it stood here
  const undo = async (gone: StaffScheduleView['daysOff'][number]) => {
    try {
      const now = await queryClient.fetchQuery({ ...sdk.team.schedule(slug, m.id), staleTime: 0 })
      await send([...now.daysOff, gone], undefined, now)
    } catch (error) {
      toast(errorText(error))
    }
  }
  const remove = async (i: number) => {
    const gone = schedule.daysOff[i]!
    try {
      await send(schedule.daysOff.filter((_, j) => j !== i))
      toast(t('removed', { range: span(gone.from, gone.to, { year: !gone.yearly }) }), {
        action: { label: t('undo'), onClick: () => void undo(gone) },
      })
    } catch (error) {
      toast(errorText(error))
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-0.5">
        <span className="text-body font-semibold text-n-900">{t('timeOff')}</span>
        <span className="text-dense text-n-600">{t('timeOffHint', { name: m.name })}</span>
      </div>
      {schedule.daysOff.length === 0 && !draft ? (
        <span className="py-2 text-dense text-n-600">{t('noTimeOff')}</span>
      ) : (
        <div role="list" aria-label={t('timeOff')} className="flex flex-col">
          {schedule.daysOff.map((d, i) => {
            const { text, sub } = line(d)
            return (
              <div key={`${d.from}-${d.to}-${d.name}`} role="listitem" className="flex items-center gap-3 border-b border-n-200 py-2">
                <CalendarOff aria-hidden strokeWidth={1.75} className="size-4.5 flex-none text-n-600" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-small font-semibold">{text}</span>
                  <span className="text-dense text-n-600">{sub}</span>
                </span>
                {owner && (
                  <Button
                    variant="plain"
                    size="s"
                    iconOnly
                    aria-label={t('remove', { range: text })}
                    disabled={busy}
                    onClick={() => void remove(i)}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}
      {owner && draft && (
        <div role="group" aria-label={t('addLabel')} className="flex flex-col gap-4 rounded-ctl-l border border-n-200 p-4">
          <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
            <Field label={t('from')}>
              <DatePicker
                copy={words}
                today={todayDate}
                min={todayDate}
                value={draft.from || null}
                onValueChange={(from) => setDraft({ ...draft, from })}
              />
            </Field>
            <Field label={t('to')} optional={t('optional')} error={dates && t(`dates.${dates}`)}>
              <DatePicker
                copy={words}
                today={todayDate}
                min={draft.from || todayDate}
                max={draft.from ? addDays(draft.from, 365) : undefined}
                value={draft.to || null}
                onValueChange={(to) => setDraft({ ...draft, to })}
              />
            </Field>
          </div>
          <Checkbox
            label={t('yearly')}
            checked={draft.yearly}
            onChange={(e) => setDraft({ ...draft, yearly: e.target.checked })}
            className="min-h-11 self-start"
          />
          <Field label={t('note')} optional={t('optional')} hint={t('noteHint')}>
            <Input
              value={draft.note}
              maxLength={DAY_OFF_NOTE_MAX}
              placeholder={t('notePlaceholder')}
              onChange={(e) => setDraft({ ...draft, note: e.target.value })}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="tertiary" size="s" disabled={busy} onClick={() => setDraft(null)}>
              {t('cancel')}
            </Button>
            <Button
              variant="secondary"
              size="s"
              disabled={!draft.from || !!dates || locked}
              loading={save.isPending && !asked}
              loadingLabel={t('saving')}
              onClick={() => void add()}
            >
              {t('add')}
            </Button>
          </div>
        </div>
      )}
      {owner && !draft && (
        <Button
          variant="secondary"
          size="s"
          className="self-start"
          id={`${id}-add`}
          disabled={busy}
          onClick={() => setDraft({ from: '', to: '', yearly: false, note: '' })}
        >
          {t('add')}
        </Button>
      )}
      <HoursAffectedBookings
        details={asked?.details ?? null}
        lead={asked ? t('offLead', { range: asked.range }) : ''}
        saving={save.isPending}
        onSave={(choice) => void add(choice)}
        onClose={() => setAsked(null)}
        words={{
          title: (what) => t('offTitle', { name: m.name, what }),
          keepCaption: t('offKeep', { name: m.name }),
          foot: t('offFoot', { name: m.name }),
          save: t('add'),
        }}
      />
    </div>
  )
}

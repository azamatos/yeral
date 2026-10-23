import { useMutation, useQuery } from '@tanstack/react-query'
import { HOURS_STEP } from '@yeral/contract/settings'
import type { DayHoursProblem } from '@yeral/domain/hours'
import { hm } from '@yeral/domain/time'
import { Spinner } from '@yeral/ui/spinner'
import { Switch } from '@yeral/ui/switch'
import { textLink } from '@yeral/ui/text-link'
import { TimeRangeField } from '@yeral/ui/time-range'
import { toast } from '@yeral/ui/toast'
import { Plus } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText, type Messages } from '@/shared/i18n'
import {
  closingClock,
  dayProblems,
  editorWeek,
  effectiveDays,
  follows,
  hoursRuns,
  leadDay,
  sameWeek,
  weekOf,
  weekValid,
  type EditorDay,
  type EditorWeek,
} from '../model/hours'
import { StepHeader, type StepAction } from './setup-frame'

type Weekday = keyof Messages['fmt']['weekdays']

/** A weekday's name, Monday first: «Monday», or «Mo» short (the step list's summary). */
export function useDayName() {
  const t = useTranslations('fmt')
  return (day: number, short = false) => {
    const key = String(day) as Weekday
    return short ? t(`weekdaysShort.${key}`) : t(`weekdays.${key}`)
  }
}

const PROBLEM = {
  'same-time': 'sameTime',
  'into-next-day': 'intoNextDay',
  'break-order': 'breakOrder',
  'break-outside': 'breakOutside',
} as const satisfies Record<DayHoursProblem, string>

/** A break needs a day of at least three steps, so time is left on both sides of it. */
const BREAK_ROOM = 3 * HOURS_STEP

/**
 * A new break's place: 13:00–14:00 (B-Onboarding) when it leaves time on both sides, else one step in the middle of the
 * day (a night bar's).
 */
function newBreak({ open, close }: EditorDay['hours']) {
  if (open < 780 && close > 840) return { start: 780, end: 840 }
  const start = open + Math.floor((close - open) / (2 * HOURS_STEP)) * HOURS_STEP
  return { start, end: start + HOURS_STEP }
}

/**
 * Step 4, «Your hours» (B-Onboarding `isHours`, design §28 hours, book B-04), as a hook like the address step: the
 * draft's week (a new draft's, every day closed, starts from the drawn week), its `save` through the hours settings
 * with the special days as they are, and the step list's summary once a week is saved («Mo–Fr 09:00–18:00, Sa
 * 09:00–20:00»). `on` while the step shows; `known` once the draft has reached it, for the summary.
 */
export function useHoursStep(slug: string, on: boolean, known: boolean): { body: ReactNode; action: StepAction; summary?: string } {
  const t = useTranslations('setup.hours')
  const sdk = useSdk()
  const errorText = useErrorText()
  const dayName = useDayName()
  const saved = useQuery({ ...sdk.settings.hours(slug), enabled: on || known })
  const update = useMutation(sdk.settings.updateHours(slug))
  const [edit, setEdit] = useState<EditorWeek | null>(null)

  const runs = saved.data && hoursRuns(saved.data.hours)
  const summary =
    runs && runs.length > 0
      ? runs
          .map((r) =>
            t('summary', {
              days: r.from === r.to ? dayName(r.from, true) : t('summaryRange', { from: dayName(r.from, true), to: dayName(r.to, true) }),
              from: hm(r.open),
              to: hm(closingClock(r.close)),
            }),
          )
          .join(', ')
      : undefined

  // a failed refetch keeps what's on screen; only a first load that failed is a failure
  if (on && !saved.data && saved.isError) throw saved.error
  const week = edit ?? (saved.data ? editorWeek(saved.data.hours) : null)
  if (!on || !week || !saved.data)
    return {
      body: (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ),
      // loading isn't saving: Continue waits, nothing is announced
      action: { valid: false, busy: false, ready: false, save: () => Promise.resolve(true) },
      summary,
    }

  const stored = saved.data
  const hours = weekOf(effectiveDays(week))
  const valid = weekValid(hours)
  const save = async (): Promise<boolean> => {
    // a valid week that isn't the saved one (a new draft's drawn week too); an invalid one isn't kept
    if (!valid || sameWeek(hours, stored.hours)) return true
    try {
      await update.mutateAsync({ hours, specialDays: stored.specialDays })
      return true
    } catch (error) {
      toast(errorText(error))
      return false
    }
  }
  return {
    body: <HoursStep week={week} onWeek={setEdit} />,
    action: {
      valid,
      hint: hours.some(Boolean) ? t('hintCheck') : t('hintNoDay'),
      busy: update.isPending,
      ready: true,
      save,
    },
    summary,
  }
}

/**
 * The step's content: «Same hours Monday to Friday» (the weekdays follow the first open one, Monday as drawn, each
 * keeping its switch), then a row per weekday with its switch, its hours (a close before the open is the next day's)
 * and one break, and the note on hours past midnight and special days. A day's problem shows under it; the footer's
 * hint says what holds Continue.
 */
function HoursStep({ week, onWeek }: { week: EditorWeek; onWeek: (week: EditorWeek) => void }) {
  const t = useTranslations('setup.hours')
  const dayName = useDayName()
  const sameId = useId()
  const days = effectiveDays(week)
  const problems = dayProblems(weekOf(days))
  const lead = dayName(leadDay(week.days))
  const update = (i: number, patch: Partial<EditorDay>) => onWeek({ ...week, days: days.map((d, j) => (j === i ? { ...d, ...patch } : d)) })
  // turning «Same hours» off keeps what Tuesday to Friday showed
  const flipSame = (same: boolean) => onWeek(same ? { ...week, same } : { days, same })
  return (
    <section className="flex flex-col gap-8 max-sm:gap-7">
      <StepHeader step="hours" title={t('title')} lead={t('lead')} />
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span id={sameId} className="text-body font-semibold">
            {t('same')}
          </span>
          <span className="text-dense text-n-600">{t('sameHint')}</span>
        </div>
        <Switch checked={week.same} onCheckedChange={flipSame} aria-labelledby={sameId} />
      </div>
      <div className="flex flex-col">
        <div aria-hidden className="grid grid-cols-[120px_52px_minmax(0,1fr)] gap-x-3 pb-2 max-sm:hidden">
          {(['day', 'open', 'hours'] as const).map((k) => (
            <span key={k} className="text-label text-n-500 uppercase">
              {t(`columns.${k}`)}
            </span>
          ))}
        </div>
        {days.map((d, i) => {
          const name = dayName(i)
          const mirror = follows(week, i)
          const problem = problems[i]
          // a day that follows another is fixed on that one
          const error = problem
            ? [t(`problems.${PROBLEM[problem]}`, { next: dayName((i + 1) % 7) }), mirror ? t('fixOn', { day: lead }) : ''].join(' ').trim()
            : undefined
          return (
            <div
              key={i}
              role="group"
              aria-labelledby={`${sameId}-day-${i}`}
              className="grid min-h-16 grid-cols-[120px_52px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-t border-n-200 py-2.5 max-sm:grid-cols-[minmax(0,1fr)_52px]"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span id={`${sameId}-day-${i}`} className="text-body leading-5 font-semibold">
                  {name}
                </span>
                {mirror && <span className="text-dense text-n-600">{t('sameAs', { day: lead })}</span>}
              </div>
              <Switch checked={d.open} onCheckedChange={(open) => update(i, { open })} aria-label={t('openLabel', { day: name })} />
              <div className="min-w-0 max-sm:col-span-full">
                {d.open ? (
                  <TimeRangeField
                    value={d.hours}
                    onChange={(hours) => update(i, { hours })}
                    fromLabel={t('opens', { day: name })}
                    toLabel={t('closes', { day: name })}
                    nextDay={(time) => t('nextDay', { time })}
                    step={HOURS_STEP}
                    disabled={mirror}
                    error={error}
                  >
                    {!d.break && !mirror && d.hours.close - d.hours.open >= BREAK_ROOM && (
                      <button
                        type="button"
                        aria-label={t('addBreak', { day: name })}
                        onClick={() => update(i, { break: newBreak(d.hours) })}
                        className={`${textLink} ml-2 inline-flex min-h-8 items-center gap-1.5 text-small`}
                      >
                        <Plus aria-hidden strokeWidth={2} className="size-4" />
                        {t('break')}
                      </button>
                    )}
                  </TimeRangeField>
                ) : (
                  <span className="text-body text-n-500">{t('closed')}</span>
                )}
              </div>
              {d.open && d.break && (
                <TimeRangeField
                  className="col-start-3 max-sm:col-span-full max-sm:col-start-1"
                  value={{ open: d.break.start, close: d.break.end }}
                  onChange={({ open, close }) => update(i, { break: { start: open, end: close } })}
                  dayStart={d.hours.open}
                  label={t('break')}
                  fromLabel={t('breakStarts', { day: name })}
                  toLabel={t('breakEnds', { day: name })}
                  step={HOURS_STEP}
                  disabled={mirror}
                  remove={mirror ? undefined : { label: t('removeBreak', { day: name }), onClick: () => update(i, { break: null }) }}
                />
              )}
            </div>
          )
        })}
      </div>
      <p className="m-0 text-dense text-n-600">{t('note')}</p>
    </section>
  )
}

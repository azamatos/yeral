import { HOURS_STEP } from '@yeral/contract/settings'
import type { DayHoursProblem } from '@yeral/domain/hours'
import { Switch } from '@yeral/ui/switch'
import { textLink } from '@yeral/ui/text-link'
import { TimeRangeField } from '@yeral/ui/time-range'
import { Plus } from 'lucide-react'
import { useId } from 'react'
import { useTranslations } from 'use-intl'
import { useDayName } from '@/shared/i18n'
import { dayProblems, effectiveDays, follows, leadDay, weekOf, type EditorDay, type EditorWeek } from '../model/hours'

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

type WeekProps = { week: EditorWeek; onWeek: (week: EditorWeek) => void }

/**
 * «Same hours Monday to Friday» (the setup wizard's, B-Onboarding): the weekdays follow the first open one, Monday as
 * drawn, each keeping its switch; turning it off keeps what Tuesday to Friday showed.
 */
export function SameHoursSwitch({ week, onWeek }: WeekProps) {
  const t = useTranslations('hours')
  const id = useId()
  const flip = (same: boolean) => onWeek(same ? { ...week, same } : { days: effectiveDays(week), same })
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span id={id} className="text-body font-semibold">
          {t('same')}
        </span>
        <span className="text-dense text-n-600">{t('sameHint')}</span>
      </div>
      <Switch checked={week.same} onCheckedChange={flip} aria-labelledby={id} />
    </div>
  )
}

/**
 * A row per weekday with its switch, its hours (a close before the open is the next day's) and one break. A day's
 * problem shows under it; a day that follows another (`week.same`) is fixed on that one.
 */
export function WeekHoursRows({ week, onWeek }: WeekProps) {
  const t = useTranslations('hours')
  const dayName = useDayName()
  const id = useId()
  const days = effectiveDays(week)
  const problems = dayProblems(weekOf(days))
  const lead = dayName(leadDay(week.days))
  const update = (i: number, patch: Partial<EditorDay>) => onWeek({ ...week, days: days.map((d, j) => (j === i ? { ...d, ...patch } : d)) })
  return (
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
        const error = problem
          ? [t(`problems.${PROBLEM[problem]}`, { next: dayName((i + 1) % 7) }), mirror ? t('fixOn', { day: lead }) : ''].join(' ').trim()
          : undefined
        return (
          <div
            key={i}
            role="group"
            aria-labelledby={`${id}-day-${i}`}
            className="grid min-h-16 grid-cols-[120px_52px_minmax(0,1fr)] items-center gap-x-3 gap-y-2 border-t border-n-200 py-2.5 max-sm:grid-cols-[minmax(0,1fr)_52px]"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span id={`${id}-day-${i}`} className="text-body leading-5 font-semibold">
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
  )
}

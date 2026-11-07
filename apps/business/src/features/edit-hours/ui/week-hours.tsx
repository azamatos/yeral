import { HOURS_STEP } from '@yeral/contract/settings'
import type { DayHoursProblem } from '@yeral/domain/hours'
import { Switch } from '@yeral/ui/switch'
import { useId } from 'react'
import { useTranslations } from 'use-intl'
import { useDayName } from '@/shared/i18n'
import { dayProblems, effectiveDays, follows, leadDay, weekOf, type EditorDay, type EditorWeek } from '../model/hours'
import { HoursRow } from './hours-row'

const PROBLEM = {
  'same-time': 'sameTime',
  'into-next-day': 'intoNextDay',
  'break-order': 'breakOrder',
  'break-outside': 'breakOutside',
} as const satisfies Record<DayHoursProblem, string>

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
 * A row per weekday (B7-Hours · B1, `HoursRow`): its switch, its times on one line (a close before the open is the
 * next day's) and a break as the gap between two times. A day's problem shows under its times; a day that follows
 * another (`week.same`) is fixed on that one.
 */
export function WeekHoursRows({ week, onWeek }: WeekProps) {
  const t = useTranslations('hours')
  const dayName = useDayName()
  const days = effectiveDays(week)
  const problems = dayProblems(weekOf(days))
  const lead = dayName(leadDay(week.days))
  const update = (i: number, patch: Partial<EditorDay>) => onWeek({ ...week, days: days.map((d, j) => (j === i ? { ...d, ...patch } : d)) })
  return (
    <div className="flex flex-col divide-y divide-n-100 border-t border-n-200">
      {days.map((d, i) => {
        const name = dayName(i)
        const mirror = follows(week, i)
        const problem = problems[i]
        const error = problem
          ? [t(`problems.${PROBLEM[problem]}`, { next: dayName((i + 1) % 7) }), mirror ? t('fixOn', { day: lead }) : ''].join(' ').trim()
          : undefined
        return (
          <div key={i} role="group" aria-label={name}>
            <HoursRow
              name={name}
              switch={{ checked: d.open, label: t('openLabel', { day: name }), onChange: (open) => update(i, { open }) }}
              hours={d.open ? d.hours : null}
              break={d.break}
              onChange={(next) => update(i, { hours: next.hours, break: next.break })}
              closedText={t('closed')}
              note={mirror ? t('sameAs', { day: lead }) : undefined}
              error={error}
              disabled={mirror}
              step={HOURS_STEP}
              labels={{
                opens: t('opens', { day: name }),
                closes: t('closes', { day: name }),
                secondOpens: t('secondOpens', { day: name }),
                secondCloses: t('secondCloses', { day: name }),
                addBreak: t('addBreak', { day: name }),
                removeBreak: (range) => t('removeBreakRange', { day: name, range }),
              }}
              nextDay={(time) => t('nextDay', { time })}
            />
          </div>
        )
      })}
    </div>
  )
}

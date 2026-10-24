import { useMutation, useQuery } from '@tanstack/react-query'
import { hm } from '@yeral/domain/time'
import { Spinner } from '@yeral/ui/spinner'
import { toast } from '@yeral/ui/toast'
import { useState, type ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import {
  closingClock,
  editorWeek,
  effectiveDays,
  hoursRuns,
  SameHoursSwitch,
  sameWeek,
  WeekHoursRows,
  weekOf,
  weekValid,
  type EditorWeek,
} from '@/features/edit-hours'
import { useSdk } from '@/shared/api'
import { useDayName, useErrorText } from '@/shared/i18n'
import { StepHeader, type StepAction } from './setup-frame'

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
 * The step's content: «Same hours Monday to Friday», then a row per weekday (the hours editor, `features/edit-hours`),
 * and the note on hours past midnight and special days. The footer's hint says what holds Continue.
 */
function HoursStep({ week, onWeek }: { week: EditorWeek; onWeek: (week: EditorWeek) => void }) {
  const t = useTranslations('setup.hours')
  return (
    <section className="flex flex-col gap-8 max-sm:gap-7">
      <StepHeader step="hours" title={t('title')} lead={t('lead')} />
      <SameHoursSwitch week={week} onWeek={onWeek} />
      <WeekHoursRows week={week} onWeek={onWeek} />
      <p className="m-0 text-dense text-n-600">{t('note')}</p>
    </section>
  )
}

import { useMutation, useQuery } from '@tanstack/react-query'
import { bookingsAffectedDetailsSchema, type BookingsAffectedDetails } from '@yeral/contract/errors'
import type { WeekdayHours } from '@yeral/contract/settings'
import { hm } from '@yeral/domain/time'
import { isApiError } from '@yeral/sdk'
import { SaveBar } from '@yeral/ui/save-bar'
import { SettingsSection, SettingsSectionTitle } from '@yeral/ui/settings-layout'
import { Spinner } from '@yeral/ui/spinner'
import { toast } from '@yeral/ui/toast'
import { useId, useState } from 'react'
import { useTranslations } from 'use-intl'
import {
  changedDays,
  closingClock,
  editorWeek,
  effectiveDays,
  HoursAffectedBookings,
  sameWeek,
  useAffectedCount,
  WeekHoursRows,
  weekOf,
  weekValid,
  type AffectedChoice,
  type EditorWeek,
} from '@/features/edit-hours'
import { useSdk } from '@/shared/api'
import { useDayName, useErrorText } from '@/shared/i18n'
import { SettingsPage } from '@/widgets/settings-frame'
import { useWorkspace } from '@/widgets/workspace-shell'

/**
 * Settings → Hours (B-Settings `pane=hours`, design §8 «Iş wagty», §28.5 hours, book B-39, Q-211): the week, a row per
 * day with its switch, hours (a close before the open is the next day's) and one break, and the save bar while it
 * differs from the saved week. A save that leaves bookings ahead outside the new hours lists them first: keep them, or
 * cancel them with 3 other times offered. The special days are saved as they are (their own section comes next).
 */
export function SettingsHoursPage() {
  const { workspace } = useWorkspace()
  if (!workspace) return null
  return <HoursSettings slug={workspace.slug} />
}

function HoursSettings({ slug }: { slug: string }) {
  const t = useTranslations('settings.hours')
  const sdk = useSdk()
  const errorText = useErrorText()
  const describe = useChangedDays()
  const count = useAffectedCount()
  const titleId = useId()
  const saved = useQuery(sdk.settings.hours(slug))
  const update = useMutation(sdk.settings.updateHours(slug))
  const [edit, setEdit] = useState<EditorWeek | null>(null)
  const [affected, setAffected] = useState<BookingsAffectedDetails | null>(null)

  // a failed refetch keeps what's on screen; only a first load that failed is a failure
  if (!saved.data && saved.isError) throw saved.error
  if (!saved.data)
    return (
      <SettingsPage section="hours" lead={t('lead')}>
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      </SettingsPage>
    )

  const stored = saved.data
  // Settings has no «Same hours Monday to Friday» (B-Settings): each day on its own
  const week = edit ?? { ...editorWeek(stored.hours), same: false }
  const hours = weekOf(effectiveDays(week))
  const dirty = !sameWeek(hours, stored.hours)
  const changed = changedDays(stored.hours, hours)

  const save = async (choice?: AffectedChoice) => {
    try {
      await update.mutateAsync({ hours, specialDays: stored.specialDays, ...(choice ? { affected: choice } : {}) })
      setEdit(null)
      setAffected(null)
      const what = affected ? count(affected.counts, 'and') : ''
      toast(
        !choice || !affected ? t('saved') : choice === 'keep' ? t('savedKept', { what, n: affected.count }) : t('savedCancelled', { what }),
      )
    } catch (error) {
      const details = isApiError(error, 'bookings_affected') ? bookingsAffectedDetailsSchema.safeParse(error.details) : null
      if (details?.success) setAffected(details.data)
      else toast(errorText(error))
    }
  }

  return (
    <SettingsPage section="hours" lead={t('lead')}>
      <SettingsSection aria-labelledby={titleId}>
        <SettingsSectionTitle id={titleId} caption={t('weekCaption')}>
          {t('weekTitle')}
        </SettingsSectionTitle>
        <WeekHoursRows week={week} onWeek={setEdit} />
        <p className="m-0 text-dense text-n-600">{t('note')}</p>
      </SettingsSection>
      {dirty && (
        <SaveBar
          message={t('save.message')}
          label={t('save.label')}
          discardLabel={t('save.discard')}
          saveLabel={t('save.save')}
          savingLabel={t('save.saving')}
          invalid={!weekValid(hours)}
          saving={update.isPending && !affected}
          onDiscard={() => setEdit(null)}
          onSave={() => void save()}
        />
      )}
      <HoursAffectedBookings
        details={affected}
        lead={describe(changed, hours)}
        saving={update.isPending}
        onSave={(choice) => void save(choice)}
        onClose={() => setAffected(null)}
      />
    </SettingsPage>
  )
}

/** «Wednesday 09:00–18:00 · Friday 18:00–02:00 (next day), break 22:00–22:30 · Sunday closed» */
function useChangedDays() {
  const t = useTranslations('settings.hours.days')
  const dayName = useDayName()
  const hoursText = (d: WeekdayHours | null) => {
    if (!d) return t('closed')
    const range = { from: hm(d.open), to: hm(closingClock(d.close)) }
    const open = d.close > 1440 ? t('nextDay', range) : t('range', range)
    return d.break ? t('withBreak', { hours: open, from: hm(d.break.start), to: hm(d.break.end) }) : open
  }
  return (days: readonly number[], week: readonly (WeekdayHours | null)[]) =>
    days.map((i) => t('day', { day: dayName(i), hours: hoursText(week[i] ?? null) })).join(' · ')
}

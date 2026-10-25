import { useMutation, useQuery } from '@tanstack/react-query'
import { bookingsAffectedDetailsSchema, type BookingsAffectedDetails } from '@yeral/contract/errors'
import type { WeekdayHours } from '@yeral/contract/settings'
import { DAY_MINUTES } from '@yeral/domain/hours'
import { useFmt } from '@yeral/i18n'
import { isApiError } from '@yeral/sdk'
import { SaveBar } from '@yeral/ui/save-bar'
import { SettingsSection, SettingsSectionTitle } from '@yeral/ui/settings-layout'
import { Spinner } from '@yeral/ui/spinner'
import { toast } from '@yeral/ui/toast'
import { useId, useState } from 'react'
import { useTranslations } from 'use-intl'
import {
  changedDays,
  effectiveDays,
  HoursAffectedBookings,
  sameWeek,
  settingsWeek,
  SpecialDays,
  WeekHoursRows,
  weekOf,
  weekValid,
  type AffectedChoice,
  type EditorWeek,
} from '@/features/edit-hours'
import { useAffectedCount, useJoin } from '@/entities/booking'
import { useSdk } from '@/shared/api'
import { useDayName, useErrorText } from '@/shared/i18n'
import { SettingsPage } from '@/widgets/settings-frame'
import { useWorkspace } from '@/widgets/workspace-shell'

/**
 * Settings → Hours (B-Settings `pane=hours`, design §8 «Iş wagty», §28.5 hours, book B-39, Q-211): the week, a row per
 * day with its switch, hours (a close before the open is the next day's) and one break, and the save bar while it
 * differs from the saved week. A save that leaves bookings ahead outside the new hours lists them first: keep them, or
 * cancel them with 3 other times offered. Under it the special days (B-40), each saved on its own from its modal; the
 * week's save sends them as they are.
 */
export function SettingsHoursPage() {
  const { workspace } = useWorkspace()
  if (!workspace) return null
  // another business's page starts from its own week
  return <HoursSettings key={workspace.slug} slug={workspace.slug} />
}

function HoursSettings({ slug }: { slug: string }) {
  const t = useTranslations('settings.hours')
  const words = useTranslations('settings.save')
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
  const week = edit ?? settingsWeek(stored.hours)
  const hours = weekOf(effectiveDays(week))
  const dirty = !sameWeek(hours, stored.hours)
  const changed = changedDays(stored.hours, hours)
  const noDay = !hours.some(Boolean)

  const save = async (choice?: AffectedChoice) => {
    const sent = hours
    try {
      const result = await update.mutateAsync({ hours: sent, specialDays: stored.specialDays, ...(choice ? { affected: choice } : {}) })
      // a change made while it saved stays
      setEdit((e) => (e && !sameWeek(weekOf(effectiveDays(e)), sent) ? e : null))
      setAffected(null)
      if (choice === 'cancel' && result.cancelled > 0)
        toast(
          t('savedCancelled', {
            what:
              affected && result.cancelled === affected.count
                ? count(affected.counts, 'and')
                : t('cancelledCount', { n: result.cancelled }),
          }),
        )
      else if (choice === 'keep' && affected) toast(t('savedKept', { what: count(affected.counts, 'and'), n: affected.count }))
      else toast(t('saved'))
    } catch (error) {
      const details = isApiError(error, 'bookings_affected') ? bookingsAffectedDetailsSchema.safeParse(error.details) : null
      if (details?.success) setAffected(details.data)
      // a special day open past midnight that the new week runs into (the special days' section comes next)
      else if (isApiError(error, 'validation_error') && specialDayIssue(error.details)) toast(t('specialDayClash'))
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
        {noDay && dirty && (
          <p role="alert" className="m-0 text-dense text-danger-ink">
            {t('noDay')}
          </p>
        )}
        <p className="m-0 text-dense text-n-600">{t('note')}</p>
      </SettingsSection>
      <SpecialDays slug={slug} saved={stored} />
      {dirty && (
        <SaveBar
          message={words('question')}
          label={words('unsaved')}
          discardLabel={words('discard')}
          saveLabel={words('save')}
          savingLabel={words('saving')}
          invalid={!weekValid(hours)}
          saving={update.isPending && !affected}
          onDiscard={() => setEdit(null)}
          onSave={() => void save()}
          // on a phone above the shell's tab bar, where its toasts sit too (B-Settings `.sbar` under 768)
          className="max-sm:bottom-[var(--toast-bottom,12px)]"
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

const specialDayIssue = (details: Record<string, unknown>) =>
  Array.isArray(details.issues) && details.issues.some((i: { path?: unknown[] }) => i.path?.[0] === 'specialDays')

/** «Wednesday 09:00–18:00 · Friday 18:00–02:00 (next day), break 00:30–01:00 · Sunday closed» */
function useChangedDays() {
  const t = useTranslations('settings.hours.days')
  const fmt = useFmt()
  const dayName = useDayName()
  const join = useJoin()
  const hoursText = (d: WeekdayHours | null) => {
    if (!d) return t('closed')
    const range = fmt.timeRange(d.open, d.close)
    const open = d.close > DAY_MINUTES ? t('nextDay', { hours: range }) : range
    return d.break ? t('withBreak', { hours: open, break: fmt.timeRange(d.break.start, d.break.end) }) : open
  }
  return (days: readonly number[], week: readonly (WeekdayHours | null)[]) =>
    join(
      days.map((i) => t('day', { day: dayName(i), hours: hoursText(week[i] ?? null) })),
      'dot',
    )
}

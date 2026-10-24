import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { InternalStatus } from '@yeral/contract/settings'
import { BOOKING_STATUSES } from '@yeral/domain/model'
import { Button } from '@yeral/ui/button'
import { ModalTrigger } from '@yeral/ui/modal'
import { SettingsSection, SettingsSectionTitle } from '@yeral/ui/settings-layout'
import { Spinner } from '@yeral/ui/spinner'
import { StatusBadge } from '@yeral/ui/status-badge'
import { Switch } from '@yeral/ui/switch'
import { toast } from '@yeral/ui/toast'
import { Lock, Plus, Trash2 } from 'lucide-react'
import { useId } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { statusName } from '../model/statuses'
import { AddStatusModal } from './add-status-modal'
import { BOOKING_STATUS_ICON, INTERNAL_STATUS_ICON } from './status-icons'

/**
 * «Booking statuses» in Booking rules (B-Settings `.ps` «r-st», book B-29, F-104): the five system statuses, locked, each
 * with its one icon and meaning; then the internal statuses only the team sees — Arrived and Started (off at first, never
 * deleted) and up to 5 in all — each switched on or off at once, the business's own deleted at once, and «Add status».
 * They save on their own (their own endpoints), not with the rules' save bar.
 */
export function BookingStatuses({ slug }: { slug: string }) {
  const t = useTranslations('settings.statuses')
  const ts = useTranslations('status')
  const sdk = useSdk()
  const titleId = useId()
  const systemId = useId()
  const internalId = useId()
  const statuses = useQuery(sdk.settings.statuses(slug))
  const preset = (p: NonNullable<InternalStatus['preset']>) => t(`presets.${p}`)
  const items = statuses.data?.items ?? []
  const max = statuses.data?.max ?? 5
  const full = items.length >= max
  const taken = [...BOOKING_STATUSES.map((s) => ts(s)), ...items.map((s) => statusName(s, preset))]

  return (
    <SettingsSection aria-labelledby={titleId}>
      <SettingsSectionTitle id={titleId} caption={t('caption')}>
        {t('title')}
      </SettingsSectionTitle>

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
          <span id={systemId} className="text-body font-semibold text-n-900">
            {t('system')}
          </span>
          <span className="inline-flex items-center gap-1.5 text-dense text-n-600">
            <Lock aria-hidden strokeWidth={1.75} className="size-3.5 flex-none" />
            {t('locked')}
          </span>
        </div>
        <ul aria-labelledby={systemId} className="m-0 flex list-none flex-col border-t border-n-200 p-0">
          {BOOKING_STATUSES.map((s) => {
            const Icon = BOOKING_STATUS_ICON[s]
            return (
              <li
                key={s}
                className="grid min-h-12 grid-cols-[136px_minmax(0,1fr)] items-center gap-x-4 gap-y-1.5 border-b border-n-200 py-2 text-small text-n-900 max-sm:grid-cols-1"
              >
                <StatusBadge status={s} icon={<Icon aria-hidden strokeWidth={2} className="size-3.5" />} className="justify-self-start">
                  {ts(s)}
                </StatusBadge>
                <span>{t(`meanings.${s}`)}</span>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-0.5">
          <span id={internalId} className="text-body font-semibold text-n-900">
            {t('internal')}
          </span>
          <span className="text-dense text-n-600">{t('internalCaption')}</span>
        </div>
        {statuses.isPending ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : statuses.isError ? (
          <p className="m-0 text-dense text-n-600">{t('failed')}</p>
        ) : (
          <div role="group" aria-labelledby={internalId} className="flex flex-col border-t border-n-200">
            {items.map((s) => (
              <StatusRow key={s.id} slug={slug} status={s} name={statusName(s, preset)} />
            ))}
          </div>
        )}
        {statuses.isSuccess && (
          <div className="flex flex-wrap items-center gap-3">
            <AddStatusModal
              slug={slug}
              taken={taken}
              trigger={
                <ModalTrigger asChild>
                  <Button variant="secondary" size="s" disabled={full}>
                    <Plus aria-hidden />
                    {t('addStatus')}
                  </Button>
                </ModalTrigger>
              }
            />
            <span className="text-dense text-n-600">
              {full ? t('full', { max }) : t('count', { n: items.length, max, left: max - items.length })}
            </span>
          </div>
        )}
      </div>
    </SettingsSection>
  )
}

/** One internal status (`.irw`): its icon in its colour, the name and what it means, delete (the business's own), on/off. */
function StatusRow({ slug, status, name }: { slug: string; status: InternalStatus; name: string }) {
  const t = useTranslations('settings.statuses')
  const sdk = useSdk()
  const queryClient = useQueryClient()
  const errorText = useErrorText()
  const update = useMutation(sdk.settings.updateStatus(slug))
  const remove = useMutation(sdk.settings.deleteStatus(slug))
  const labelId = useId()
  const Icon = INTERNAL_STATUS_ICON[status.icon]
  const busy = update.isPending || remove.isPending
  // shows the switch where it's going while it saves; back where it was if that fails
  const enabled = update.isPending && update.variables ? (update.variables.enabled ?? status.enabled) : status.enabled

  return (
    <div className="flex min-h-15 items-center gap-3 border-b border-n-200 py-1.5">
      <span
        className="inline-flex size-8 flex-none items-center justify-center rounded-pill border border-n-200 bg-n-0"
        style={{ color: status.color }}
      >
        <Icon aria-hidden strokeWidth={2} className="size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span id={labelId} className="text-body font-semibold text-n-900">
          {name}
        </span>
        <span className="text-dense text-n-600">{status.preset ? t(`presetCaptions.${status.preset}`) : t('ownCaption')}</span>
      </span>
      {!status.preset && (
        <Button
          variant="ghost"
          iconOnly
          aria-label={t('delete', { name })}
          disabled={busy}
          className="size-9 flex-none"
          onClick={() =>
            remove.mutate(status.id, {
              onSuccess: () => toast(t('deleted', { name })),
              onError: (error) => toast(errorText(error)),
            })
          }
        >
          <Trash2 />
        </Button>
      )}
      <Switch
        aria-labelledby={labelId}
        checked={enabled}
        disabled={busy}
        onCheckedChange={(on) =>
          update.mutate(
            { id: status.id, enabled: on },
            {
              // the list shows it at once, before its refetch comes back
              onSuccess: (saved) =>
                queryClient.setQueryData(
                  sdk.settings.statuses(slug).queryKey,
                  (list) => list && { ...list, items: list.items.map((x) => (x.id === saved.id ? saved : x)) },
                ),
              onError: (error) => toast(errorText(error)),
            },
          )
        }
      />
    </div>
  )
}

import { useQuery } from '@tanstack/react-query'
import type { BusinessDetail } from '@yeral/contract/catalog'
import { today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { useSdk } from '@yeral/sdk/react'
import { Avatar } from '@yeral/ui/avatar'
import { useClock } from '@yeral/ui/clock'
import { Rating } from '@yeral/ui/rating'
import { Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { calendarAt } from '@/shared/lib'
import { specialistsDoingAll } from '../model/flow'
import { LoadFailed } from './load-failed'
import { PickList, PickRow } from './pick-row'
import { StepTitle } from './step-title'

type NextFree = { date: string; start: number } | null

/**
 * Step 2 (Booking `step=staff`, book C-13; C7-Booking C4.1 `SpecialistRow`): «Any specialist» with the earliest free
 * time, then only the people who do every picked service, each a row with the avatar, name, job · rating and «Next
 * free» as a labelled fact (a third line on a phone). A tap tints the row for 150 ms and moves on (`onPick`); the one
 * the flow has already shows the check. When nobody does them all, the lead says a free specialist is chosen for
 * each. In move mode (C-30) the api reads the booking's own services and leaves its own time out of the busy ones; the
 * one it's with now says «Current».
 */
export function StaffStep({
  detail,
  serviceIds,
  staff,
  onPick,
  move,
}: {
  detail: BusinessDetail
  serviceIds: string[]
  staff: string
  onPick: (staff: string) => void
  /** The booking being moved and who it's with now. */
  move?: { code: string; current: string | null }
}) {
  const words = useTranslations('booking.move')
  const t = useTranslations('booking.staff')
  const at = useTranslations('booking')
  const fmt = useFmt()
  const lang = useLocale()
  const sdk = useSdk()
  const now = useClock()
  // in move mode the api reads the booking's own services (2026-10-30-move-own-services.md)
  const free = useQuery(sdk.availability.specialists(detail.slug, { lang, services: move ? undefined : serviceIds, move: move?.code }))
  // a start past midnight reads on the next calendar day
  const when = (next: NextFree) => {
    if (!next) return null
    const c = calendarAt(next.date, next.start)
    return at('at', { day: fmt.relativeShortDate(c.date, today(now)), time: fmt.time(c.start) })
  }
  // a move whose services left the menu lists everyone (the api refuses it anyway, `not_bookable`)
  const listed = move && serviceIds.length === 0 ? detail.specialists : specialistsDoingAll(detail, serviceIds)
  const first = serviceIds.map((id) => detail.serviceGroups.flatMap((g) => g.services).find((s) => s.id === id)?.name).find(Boolean)
  const lead = move
    ? t('lead')
    : listed.length === 0
      ? t('noOneDoesAll')
      : serviceIds.length === 1 && first
        ? t('count', { count: listed.length, service: first })
        : t('countAll', { count: listed.length, services: serviceIds.length })
  // «Earliest» / «Next free»: a labelled fact at the right from 768, a third line under the name on a phone
  const row = (id: string, leading: ReactNode, name: ReactNode, caption: ReactNode, label: string, next: NextFree) => {
    const value = free.data ? (when(next) ?? t('noneSoon')) : null
    return (
      <PickRow key={id} pressed={id === staff} onPick={() => onPick(id)}>
        {leading}
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[15px] leading-5 font-semibold">{name}</span>
          <span className="text-n-700 flex flex-wrap items-center gap-1.5 text-dense">{caption}</span>
          <span className="text-n-700 truncate text-dense sm:hidden">
            {label} · <span className="font-medium text-n-900">{value}</span>
          </span>
        </span>
        <span className="flex flex-none flex-col items-end gap-0.5 max-sm:hidden">
          <span className="text-[12px] leading-4 text-n-600">{label}</span>
          <span className="text-small font-medium">{value ?? ' '}</span>
        </span>
      </PickRow>
    )
  }
  return (
    <div className="flex flex-col gap-6">
      <StepTitle title={move ? words('staffTitle') : t('title')} lead={lead} level={move ? 2 : 1} />
      {free.isError && !free.data && <LoadFailed onRetry={() => void free.refetch()} />}
      <PickList role="group" aria-label={t('label')}>
        {row(
          'any',
          <span aria-hidden className="flex size-12 flex-none items-center justify-center rounded-pill bg-a-50 text-a-600">
            <Users className="size-[22px]" strokeWidth={1.75} />
          </span>,
          t('any'),
          t('anyCaption'),
          t('earliestLabel'),
          free.data?.any ?? null,
        )}
        {listed.map((s) =>
          row(
            s.id,
            <Avatar name={s.name} src={s.photo?.url} size={48} tone="neutral" decorative className="text-n-900" />,
            <>
              {s.name}
              {move?.current === s.id && <span className="ml-2 font-normal text-n-600">{words('current')}</span>}
            </>,
            <>
              {s.role}
              {s.role && s.rating !== null && <span aria-hidden>·</span>}
              {s.rating !== null && <Rating value={fmt.rating(s.rating)} className="text-dense" />}
            </>,
            t('nextLabel'),
            free.data?.items.find((i) => i.staffId === s.id)?.next ?? null,
          ),
        )}
      </PickList>
    </div>
  )
}

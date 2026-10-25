import { useQuery } from '@tanstack/react-query'
import type { BusinessDetail } from '@yeral/contract/catalog'
import { today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { useSdk } from '@yeral/sdk/react'
import { Avatar } from '@yeral/ui/avatar'
import { useClock } from '@yeral/ui/clock'
import { cn } from '@yeral/ui/cn'
import { Rating } from '@yeral/ui/rating'
import { Users } from 'lucide-react'
import type { ReactNode } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { doesAll } from '../model/flow'
import { StepTitle } from './step-title'

type NextFree = { date: string; start: number } | null

/** One choice (Booking `.opt`): 16 padding, r16, the 48 avatar, the name 16/22 600, a line under it, the radio. */
function Option({
  checked,
  disabled,
  onPick,
  avatar,
  name,
  children,
}: {
  checked: boolean
  disabled?: boolean
  onPick: () => void
  avatar: ReactNode
  name: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      disabled={disabled}
      onClick={onPick}
      className={cn(
        'flex w-full cursor-pointer items-center gap-4 rounded-card border border-n-200 bg-n-0 p-4 text-left font-sans text-n-900 focus-visible:shadow-focus focus-visible:outline-none enabled:hover:bg-n-50 disabled:cursor-not-allowed disabled:text-n-500',
        checked && 'border-a-line bg-a-50 enabled:hover:bg-a-50',
      )}
    >
      {avatar}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-[16px] leading-[22px] font-semibold">{name}</span>
        {children}
      </span>
      <span
        aria-hidden
        className={cn(
          'size-5 flex-none rounded-pill border-[1.5px] border-n-400 bg-n-0',
          checked && 'border-[6px] border-a-500',
          disabled && 'border-n-200 bg-n-50',
        )}
      />
    </button>
  )
}

/**
 * Step 2 (Booking `step=staff`, book C-13): «Any specialist» with the earliest free time, then everyone who does the
 * picked services with their next free time; someone who doesn't do them all stays listed, disabled, saying so. When
 * nobody does them all, the note says a free specialist is chosen for each.
 */
export function StaffStep({
  detail,
  serviceIds,
  staff,
  onPick,
}: {
  detail: BusinessDetail
  serviceIds: string[]
  staff: string
  onPick: (staff: string) => void
}) {
  const t = useTranslations('booking.staff')
  const at = useTranslations('booking')
  const fmt = useFmt()
  const lang = useLocale()
  const sdk = useSdk()
  const now = useClock()
  const free = useQuery(sdk.availability.specialists(detail.slug, { lang, services: serviceIds }))
  const when = (next: NextFree) =>
    next ? at('at', { day: fmt.relativeShortDate(next.date, today(now)), time: fmt.time(next.start) }) : null
  const nextOf = (id: string) => free.data?.items.find((i) => i.staffId === id)?.next ?? null
  const anyOne = detail.specialists.some((s) => doesAll(s, serviceIds))
  const anyWhen = free.data ? when(free.data.any) : null
  return (
    <div className="flex flex-col gap-6">
      <StepTitle title={t('title')} lead={t('lead')} />
      {!anyOne && <p className="m-0 rounded-m bg-group px-3.5 py-3 text-small text-n-600">{t('noOneDoesAll')}</p>}
      <div role="radiogroup" aria-label={t('label')} className="flex flex-col gap-3">
        <Option
          checked={staff === 'any'}
          onPick={() => onPick('any')}
          name={t('any')}
          avatar={
            <span
              aria-hidden
              className={cn(
                'flex size-12 flex-none items-center justify-center rounded-pill',
                staff === 'any' ? 'bg-n-0 text-a-600' : 'bg-n-100 text-n-900',
              )}
            >
              <Users className="size-[22px]" strokeWidth={1.75} />
            </span>
          }
        >
          <span className="text-dense text-n-600">{free.data ? (anyWhen ? t('earliest', { when: anyWhen }) : t('noneSoon')) : ' '}</span>
        </Option>
        {detail.specialists.map((s) => {
          const ok = doesAll(s, serviceIds)
          const next = when(nextOf(s.id))
          return (
            <Option
              key={s.id}
              checked={ok && staff === s.id}
              disabled={!ok}
              onPick={() => onPick(s.id)}
              name={s.name}
              avatar={
                <Avatar
                  name={s.name}
                  src={s.photo?.url}
                  size={48}
                  tone="neutral"
                  decorative
                  className={cn('text-n-900', !ok && 'bg-n-50 text-n-500', ok && staff === s.id && 'bg-n-0 text-a-600')}
                />
              }
            >
              {(s.role || s.rating !== null) && (
                <span className="inline-flex flex-wrap items-center gap-1.5 text-dense text-n-600">
                  {s.role}
                  {s.role && s.rating !== null && <span aria-hidden>·</span>}
                  {s.rating !== null && <Rating value={fmt.rating(s.rating)} className={cn('text-dense', !ok && 'text-n-500')} />}
                </span>
              )}
              <span className="text-dense text-n-600">
                {!ok
                  ? serviceIds.length > 1
                    ? t('cantAll')
                    : t('cantOne')
                  : free.data
                    ? next
                      ? t('next', { when: next })
                      : t('noneSoon')
                    : ' '}
              </span>
            </Option>
          )
        })}
      </div>
    </div>
  )
}

import { Link } from '@tanstack/react-router'
import type { BusinessDetail } from '@yeral/contract/catalog'
import { today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { useClock } from '@yeral/ui/clock'
import { cn } from '@yeral/ui/cn'
import { CalendarX2, CircleCheck, Clock, MapPin, Phone, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { selectionTotal } from '@/features/pick-services'
import { calendarAt } from '@/shared/lib'
import { dayHours, openLine } from '../model/when'
import type { BookingState } from './business-page'
import { FavouriteButton } from './favourite'

type Detail = BusinessDetail
type Service = Detail['serviceGroups'][number]['services'][number]

/** An icon row of the card and the About part (`.ir`): 20 icon, 15/22 text, 12 apart. */
function InfoRow({ icon, children, className }: { icon: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-start gap-3 text-body [&>svg]:mt-px [&>svg]:size-5 [&>svg]:flex-none', className)}>
      {icon}
      {children}
    </div>
  )
}

/** Today's hours and whether it's open (green while open), the address with its floor and distance. */
function PlaceRows({ detail }: { detail: Detail }) {
  const t = useTranslations('business')
  const fmt = useFmt()
  const now = useClock()
  const hours = dayHours(detail, now, fmt)
  const open = openLine(detail.open, today(now), fmt, t)
  return (
    <>
      <InfoRow icon={<Clock aria-hidden />}>
        <span>
          {'hours' in hours
            ? t('card.today', { hours: hours.hours })
            : hours.reason
              ? t('card.closedFor', { reason: hours.reason })
              : t('card.closedToday')}{' '}
          · <span className={cn('font-semibold', open.isOpen ? 'text-st-completed-ink' : 'text-n-600')}>{open.text}</span>
        </span>
      </InfoRow>
      <InfoRow icon={<MapPin aria-hidden />}>
        <span className="flex flex-col">
          <span>{fmt.addressIn(detail.address, detail.city.name)}</span>
          {(detail.floor || detail.distanceM !== null) && (
            <span>
              {detail.floor}
              {detail.distanceM !== null && (
                <span className="text-dense text-n-600">
                  {detail.floor ? ' · ' : ''}
                  {fmt.distance(detail.distanceM)}
                </span>
              )}
            </span>
          )}
        </span>
      </InfoRow>
    </>
  )
}

function CallLink({
  phone,
  size = 'l',
  variant = 'primary',
  className,
}: {
  phone: string
  size?: 'm' | 'l'
  variant?: 'primary' | 'secondary'
  className?: string
}) {
  const t = useTranslations('business.card')
  const fmt = useFmt()
  return (
    <Button asChild size={size} variant={variant} className={className}>
      <a href={`tel:${phone}`} aria-label={t('callLabel', { phone: fmt.phone(phone) })}>
        <Phone aria-hidden />
        {t('call')}
      </a>
    </Button>
  )
}

/** «Today 15:30», «Tomorrow 10:00», «Fri, 16 Oct 10:00»: the next free time on the card and the bar. */
function useNextFree(next: Detail['nextFree']): string | null {
  const t = useTranslations('business.card')
  const fmt = useFmt()
  const now = useClock()
  if (!next) return null
  // a start past midnight reads on the next calendar day
  const at = calendarAt(next.date, next.start)
  return t('at', { day: fmt.relativeShortDate(at.date, today(now)), time: fmt.time(at.start) })
}

/** How the business answers (`typicalConfirmMinutes`, book Q-113): within its usual time, by hand, or at once. */
function ConfirmLine({ detail }: { detail: Detail }) {
  const t = useTranslations('business.card')
  const fmt = useFmt()
  if (detail.confirmMode === 'instant') return t('confirmsAtOnce')
  return detail.typicalConfirmMinutes ? t('confirmsWithin', { time: fmt.duration(detail.typicalConfirmMinutes) }) : t('confirmsByHand')
}

/** The booking flow's address with what's picked: the services step with nothing, the specialist step with some. */
function BookLink({
  slug,
  picked,
  children,
  disabled,
}: {
  slug: string
  picked: readonly Service[]
  children: ReactNode
  disabled: boolean
}) {
  const lang = useLocale()
  if (disabled)
    return (
      <Button size="l" variant="primary" className="w-full" disabled>
        {children}
      </Button>
    )
  return (
    <Button asChild size="l" variant="primary" className="w-full">
      <Link
        to="/$lang/b/$slug/book"
        params={{ lang, slug }}
        search={picked.length > 0 ? { services: picked.map((s) => s.id).join(','), step: 'staff' } : {}}
      >
        {children}
      </Link>
    </Button>
  )
}

/**
 * The sticky card beside the page (Venue aside, ≥ 1024): the next free time and «Book» before anything is picked; the
 * picked services with their total, «Continue» and «Clear» after (book C-06, C-15); the call card for a client the
 * business books by phone only (C-11, Mobile 15: first on narrower screens); the paused card while online booking is
 * off (C-09, States 05). On an owner's preview nothing can be booked (Q-153): the buttons stay, disabled.
 */
export function BookingCard({
  detail,
  state,
  picked,
  onRemove,
  onClear,
}: {
  detail: Detail
  state: BookingState
  picked: readonly Service[]
  onRemove: (id: string) => void
  onClear: () => void
}) {
  const t = useTranslations('business')
  const fmt = useFmt()
  const next = useNextFree(detail.nextFree)
  const card = 'sticky top-6 rounded-card border border-n-200 bg-n-0 p-6'
  if (state === 'phone-only')
    return (
      <div className={cn(card, 'max-md:static')}>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-3.5">
            <span aria-hidden className="flex size-11 flex-none items-center justify-center rounded-pill bg-group text-n-900">
              <Phone className="size-[22px]" strokeWidth={1.75} />
            </span>
            <div className="flex flex-col gap-1.5">
              <h2 className="m-0 text-[19px] leading-6 font-bold tracking-[-0.01em] text-pretty">{t('restricted.title')}</h2>
              <p className="m-0 text-body text-pretty text-n-600">{t('restricted.lead')}</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 max-md:hidden">
            <span className="text-[22px] leading-7 font-bold tracking-[-0.01em] tabular-nums">{fmt.phone(detail.phone)}</span>
            <CallLink phone={detail.phone} className="w-full" />
          </div>
          <div className="h-px bg-n-200 max-md:hidden" />
          <div className="flex flex-col gap-4 max-md:hidden">
            <PlaceRows detail={detail} />
          </div>
        </div>
      </div>
    )
  if (state === 'paused')
    return (
      <div className={card}>
        <div className="flex flex-col gap-3">
          <span aria-hidden className="flex size-11 flex-none items-center justify-center rounded-pill bg-group text-n-900">
            <CalendarX2 className="size-[22px]" strokeWidth={1.75} />
          </span>
          <div className="flex flex-col gap-1">
            <h2 className="m-0 text-[17px] leading-[22px] font-semibold">{t('paused.title')}</h2>
            <p className="m-0 text-body text-n-600">{t('paused.lead')}</p>
          </div>
          <CallLink phone={detail.phone} size="m" variant="secondary" className="w-full" />
          <FavouriteButton slug={detail.slug} wide />
          <div className="h-px bg-n-200" />
          <div className="flex flex-col gap-4">
            <PlaceRows detail={detail} />
          </div>
        </div>
      </div>
    )
  const disabled = state === 'preview'
  if (picked.length === 0) {
    return (
      <div className={card}>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <span className="text-label text-n-500 uppercase">{t('card.nextFree')}</span>
            <span className={cn(next ? 'text-[28px] leading-[34px] font-bold tracking-[-0.02em]' : 'text-body-l font-semibold text-n-600')}>
              {next ?? t('card.noFree')}
            </span>
          </div>
          <BookLink slug={detail.slug} picked={picked} disabled={disabled}>
            {t('card.book')}
          </BookLink>
          <div className="h-px bg-n-200" />
          <div className="flex flex-col gap-4">
            <PlaceRows detail={detail} />
            <InfoRow icon={<Phone aria-hidden />} className="items-center [&>svg]:mt-0">
              <a href={`tel:${detail.phone}`} className="flex-1 text-n-900 tabular-nums hover:text-a-600">
                {fmt.phone(detail.phone)}
              </a>
            </InfoRow>
          </div>
          <div className="h-px bg-n-200" />
          <span className="flex items-center gap-2 text-dense text-n-600">
            <CircleCheck aria-hidden className="size-4 flex-none" strokeWidth={1.75} />
            <ConfirmLine detail={detail} />
          </span>
        </div>
      </div>
    )
  }
  const total = selectionTotal(picked)
  return (
    <div className={card}>
      <div className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[19px] leading-6 font-bold tracking-[-0.01em]">{t('card.chosen')}</span>
          <span className="text-dense text-n-600">{t('card.count', { count: picked.length })}</span>
        </div>
        <ul className="m-0 flex list-none flex-col p-0">
          {picked.map((s) => (
            <li key={s.id} className="flex items-start gap-3 border-t border-n-200 py-3.5">
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-body font-semibold">{s.name}</span>
                <span className="text-dense text-n-600">{fmt.duration(s.durationMin)}</span>
              </div>
              <span
                className={cn(
                  s.price.type === 'hidden'
                    ? 'max-w-26 text-right text-dense font-medium text-n-600'
                    : 'text-body font-semibold whitespace-nowrap',
                )}
              >
                {fmt.price(s.price)}
              </span>
              <button
                type="button"
                aria-label={t('card.remove', { name: s.name })}
                onClick={() => onRemove(s.id)}
                className="-mt-1.5 -mr-2 inline-flex size-8 flex-none cursor-pointer items-center justify-center rounded-input border-0 bg-transparent text-n-600 hover:bg-group hover:text-n-900 focus-visible:shadow-focus focus-visible:outline-none"
              >
                <X aria-hidden className="size-4" strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
        <div className="-mt-4 h-px bg-n-200" />
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="text-body font-semibold whitespace-nowrap">
            {t('card.total')} <span className="font-normal text-n-600">· {fmt.duration(total.minutes)}</span>
          </span>
          <span
            className={cn(
              'ml-auto',
              total.price.type === 'hidden'
                ? 'text-right text-body font-medium text-n-600'
                : 'text-[19px] leading-6 font-bold whitespace-nowrap',
            )}
          >
            {fmt.price(total.price)}
          </span>
        </div>
        <div className="mt-1">
          <BookLink slug={detail.slug} picked={picked} disabled={disabled}>
            {t('card.continue')}
          </BookLink>
        </div>
        <Button variant="ghost" className="-mt-2 w-full" onClick={onClear}>
          {t('card.clear')}
        </Button>
        <span className="text-center text-dense text-n-600">{t('card.payAtPlace')}</span>
      </div>
    </div>
  )
}

/**
 * The bar at the bottom under 1024 (Venue `.mbar`, Mobile 4): the next free time or the picked services' count,
 * minutes and total beside «Book» / «Continue»; the business's name and number beside «Call» for a phone-only client
 * (Mobile 15) and while online booking is paused (States 05, with the heart).
 */
export function BookingBar({ detail, state, picked }: { detail: Detail; state: BookingState; picked: readonly Service[] }) {
  const t = useTranslations('business')
  const fmt = useFmt()
  const next = useNextFree(detail.nextFree)
  const bar = 'sticky bottom-0 z-10 flex items-center justify-between gap-4 border-t border-n-200 bg-n-0 px-6 py-3 md:hidden max-sm:px-4'
  if (state === 'phone-only' || state === 'paused')
    return (
      <div role="region" aria-label={t('card.label')} className={bar}>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-dense text-n-600">{detail.name}</span>
          <span className="text-[17px] leading-[22px] font-bold whitespace-nowrap tabular-nums">{fmt.phone(detail.phone)}</span>
        </div>
        <div className="flex flex-none gap-2">
          {state === 'paused' && <FavouriteButton slug={detail.slug} />}
          <CallLink phone={detail.phone} />
        </div>
      </div>
    )
  const total = selectionTotal(picked)
  return (
    <div role="region" aria-label={t('card.label')} className={bar}>
      <div className="flex min-w-0 flex-col">
        <span className="text-dense text-n-600">
          {picked.length === 0 ? t('card.nextFree') : `${t('card.count', { count: picked.length })} · ${fmt.duration(total.minutes)}`}
        </span>
        {picked.length === 0 ? (
          <span className={cn('whitespace-nowrap', next ? 'text-[17px] leading-[22px] font-bold' : 'text-body font-semibold text-n-600')}>
            {next ?? t('card.noFree')}
          </span>
        ) : (
          <span
            className={cn(
              'whitespace-nowrap',
              total.price.type === 'hidden' ? 'text-body font-semibold text-n-600' : 'text-[17px] leading-[22px] font-bold',
            )}
          >
            {fmt.price(total.price)}
          </span>
        )}
      </div>
      <div className="flex-none">
        <BookLink slug={detail.slug} picked={picked} disabled={state === 'preview'}>
          {picked.length === 0 ? t('card.book') : t('card.continue')}
        </BookLink>
      </div>
    </div>
  )
}

import type { BusinessDetail } from '@yeral/contract/catalog'
import type { Price as PriceValue } from '@yeral/domain/model'
import { useFmt } from '@yeral/i18n'
import { directionsUrl } from '@yeral/lib/links'
import { Button } from '@yeral/ui/button'
import { cn } from '@yeral/ui/cn'
import { Price } from '@yeral/ui/price'
import { Rating } from '@yeral/ui/rating'
import { textLink } from '@yeral/ui/text-link'
import { CalendarCheck, CalendarDays, Lock, MapPin, Navigation, Plus, User, Wallet, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { calendarAt } from '@/shared/lib'

type Service = BusinessDetail['serviceGroups'][number]['services'][number]

const divider = <div aria-hidden className="my-5 h-px flex-none bg-n-200" />

/**
 * The booking's card beside the steps from 1024 (C7-Booking C4.4 `BookingSummary`): «Your booking» with Clear
 * (Tertiary S), the business, the picked services (× from two up) and «Add a service», the specialist and the time
 * with Change, the total with its duration and «Pay at the place» under it, then the step's primary, only on the steps
 * that have one (Time, Confirm). Gaps 12 inside a group, 20 around the dividers, 4 from the total to the pay line, 24
 * before the action. On Confirm (`confirm`, C4.5) it's the booking card: the business bigger (photo 120, name, rating,
 * address with «Get directions»), the booking as facts, the total and «Confirm booking». The page works out the total
 * and the name once for the card and the bar. In move mode (`move`, C-30) the services are locked with the way to
 * change them, and the previous time stands above the new one.
 */
export function Summary({
  detail,
  picked,
  total,
  staffName,
  date,
  time,
  cta,
  hint,
  move,
  confirm = false,
  onClear,
  onAdd,
  onRemove,
  onChangeStaff,
  onChangeTime,
}: {
  detail: BusinessDetail
  picked: readonly Service[]
  total: { minutes: number; price: PriceValue }
  staffName: string | null
  date: string | null
  time: number | null
  cta: ReactNode
  hint: string | null
  /** The booking's time now («Thursday, 15 October · 14:30–15:30»). */
  move?: { before: string }
  confirm?: boolean
  onClear?: () => void
  onAdd?: () => void
  onRemove?: (id: string) => void
  onChangeStaff?: () => void
  onChangeTime?: () => void
}) {
  const t = useTranslations('booking')
  const fmt = useFmt()
  const photo = detail.photos[0]
  const timed = date !== null && time !== null
  // a start past midnight reads on the next calendar day
  const whenText = (date: string, time: number) =>
    t('summary.when', { date: fmt.weekdayDate(calendarAt(date, time).date), range: fmt.timeRange(time, time + total.minutes) })
  const shortWhen = (date: string, time: number) =>
    t('summary.when', { date: fmt.shortDate(calendarAt(date, time).date), range: fmt.timeRange(time, time + total.minutes) })

  const services = (
    <div className="flex flex-col gap-3">
      {picked.length === 0 && <span className="text-dense text-n-600">{t('summary.none')}</span>}
      {picked.map((s) => (
        <div key={s.id} className="flex min-w-0 items-start gap-2">
          {move && <Lock aria-hidden className="mt-0.5 size-4 flex-none text-n-600" strokeWidth={1.75} />}
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[15px] leading-5 font-medium">{s.name}</span>
            <span className="text-dense text-n-600">{fmt.duration(s.durationMin)}</span>
          </span>
          <Price hidden={s.price.type === 'hidden'} className="text-[15px] leading-5">
            {fmt.price(s.price)}
          </Price>
          {onRemove && picked.length > 1 && (
            <Button
              variant="plain"
              size="s"
              iconOnly
              className="-my-1.5 -mr-2"
              aria-label={t('summary.remove', { name: s.name })}
              onClick={() => onRemove(s.id)}
            >
              <X aria-hidden />
            </Button>
          )}
        </div>
      ))}
      {move && <span className="text-dense text-n-600">{t('move.locked')}</span>}
      {onAdd && picked.length > 0 && (
        <Button variant="tertiary" size="s" className="w-full justify-start px-2.5" onClick={onAdd}>
          <Plus aria-hidden />
          {t('summary.add')}
        </Button>
      )}
    </div>
  )

  const row = (icon: ReactNode, label: string, value: ReactNode, change?: { label: string; onClick: () => void }, strong = false) => (
    <div className="[&>svg]:text-n-700 flex min-w-0 items-center gap-3 [&>svg]:size-4 [&>svg]:flex-none">
      {icon}
      <span className="flex min-w-0 flex-1 flex-col">
        {label && <span className="text-[12px] leading-4 text-n-600">{label}</span>}
        <span className={cn('truncate text-small', strong && 'font-semibold')}>{value}</span>
      </span>
      {change && (
        <Button variant="tertiary" size="s" aria-label={change.label} onClick={change.onClick}>
          {t('summary.change')}
        </Button>
      )}
    </div>
  )
  const who = staffName && (
    <div className="flex flex-col gap-3">
      {row(
        <User aria-hidden strokeWidth={1.75} />,
        t('summary.specialist'),
        staffName,
        onChangeStaff && { label: t('summary.changeStaff'), onClick: onChangeStaff },
      )}
      {/* move mode: the previous time above the new one, each saying which it is */}
      {move && row(<CalendarDays aria-hidden strokeWidth={1.75} />, '', t('move.before', { when: move.before }))}
      {timed &&
        row(
          move ? <CalendarCheck aria-hidden strokeWidth={1.75} /> : <CalendarDays aria-hidden strokeWidth={1.75} />,
          move ? '' : t('summary.dateTime'),
          move ? t('move.after', { when: whenText(date, time) }) : whenText(date, time),
          onChangeTime && { label: t('summary.changeTime'), onClick: onChangeTime },
          Boolean(move),
        )}
    </div>
  )

  const totalBlock = (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <span className="whitespace-nowrap">
          <span className="text-[16px] leading-6 font-semibold">{t('summary.total')}</span>
          {!confirm && picked.length > 0 && <span className="ml-2 text-small text-n-600">{fmt.duration(total.minutes)}</span>}
        </span>
        {picked.length > 0 && (
          <Price size="total" hidden={total.price.type === 'hidden'} className="text-[24px] leading-8 font-bold tracking-[-0.01em]">
            {fmt.price(total.price)}
          </Price>
        )}
      </div>
      <span className="text-n-700 mt-1 flex items-center gap-2 text-dense">
        <Wallet aria-hidden className="size-4 flex-none" strokeWidth={1.75} />
        {t('summary.payAtPlace')}
      </span>
    </>
  )

  const action = cta && (
    <div className="mt-6 flex flex-col gap-2">
      {cta}
      {hint && <span className="text-center text-dense text-n-600">{hint}</span>}
    </div>
  )

  if (confirm)
    return (
      <div className="flex flex-col rounded-card border border-n-200 bg-n-0 p-6 max-sm:p-4">
        <div className="flex items-start gap-4 max-sm:flex-col max-sm:gap-3">
          {photo && (
            <img
              src={photo.url}
              alt=""
              className="block size-30 flex-none rounded-ctl-l object-cover max-sm:aspect-video max-sm:h-auto max-sm:w-full"
            />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="m-0 text-[20px] leading-7 font-semibold tracking-[-0.01em]">{detail.name}</h2>
            {detail.rating !== null && detail.reviewsCount > 0 && (
              <Rating value={fmt.rating(detail.rating)} count={fmt.number(detail.reviewsCount)} className="text-small" />
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-1">
          <span className="flex items-start gap-2 text-small">
            <MapPin aria-hidden className="text-n-700 mt-0.5 size-4 flex-none" strokeWidth={1.75} />
            {detail.address}
          </span>
          <a
            href={directionsUrl(detail.geo, detail.name)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(textLink, 'ml-6 inline-flex items-center gap-1 self-start text-small font-semibold')}
          >
            {t('summary.directions')}
            <Navigation aria-hidden className="size-3.5" strokeWidth={2} />
          </a>
        </div>
        {divider}
        <dl className="m-0 grid grid-cols-2 gap-x-4 gap-y-3.5">
          {timed && (
            <div className="col-span-full flex flex-col gap-0.5">
              <dt className="text-[12px] leading-4 text-n-600">{t('summary.dateTime')}</dt>
              <dd className="m-0 text-small">{shortWhen(date, time)}</dd>
            </div>
          )}
          <div className="col-span-full flex flex-col gap-0.5">
            <dt className="text-[12px] leading-4 text-n-600">{t('summary.services', { count: picked.length })}</dt>
            {picked.map((s) => (
              <dd key={s.id} className="m-0 text-small">
                {s.price.type === 'hidden' ? s.name : t('summary.servicePrice', { name: s.name, price: fmt.price(s.price) })}
              </dd>
            ))}
          </div>
          {staffName && (
            <div className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-[12px] leading-4 text-n-600">{t('summary.specialist')}</dt>
              <dd className="m-0 truncate text-small">{staffName}</dd>
            </div>
          )}
          <div className="flex flex-col gap-0.5">
            <dt className="text-[12px] leading-4 text-n-600">{t('summary.duration')}</dt>
            <dd className="m-0 text-small">{fmt.duration(total.minutes)}</dd>
          </div>
        </dl>
        <div aria-hidden className="mt-5 mb-4 h-px flex-none bg-n-200" />
        {totalBlock}
        {action}
      </div>
    )

  return (
    <div className="flex flex-col rounded-card border border-n-200 bg-n-0 px-6 pt-4 pb-6">
      <div className="flex h-8 items-center justify-between gap-3">
        <span className="text-[11px] leading-3.5 font-semibold tracking-[.07em] text-n-600 uppercase">{t('summaryLabel')}</span>
        {onClear && picked.length > 0 && (
          <Button variant="tertiary" size="s" aria-label={t('summary.clearLabel')} onClick={onClear}>
            {t('summary.clear')}
          </Button>
        )}
      </div>
      <div className="mt-3 flex min-w-0 items-center gap-3">
        {photo && <img src={photo.url} alt="" className="block size-12 flex-none rounded-ctl-m object-cover" />}
        <span className="flex min-w-0 flex-col">
          <span className="text-[15px] leading-5 font-semibold">{detail.name}</span>
          <span className="truncate text-dense text-n-600">{detail.address}</span>
        </span>
      </div>
      {divider}
      {services}
      {who && (
        <>
          {divider}
          {who}
        </>
      )}
      <div aria-hidden className="mt-5 mb-4 h-px flex-none bg-n-200" />
      {totalBlock}
      {action}
    </div>
  )
}

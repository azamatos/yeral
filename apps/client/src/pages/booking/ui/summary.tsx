import type { BusinessDetail } from '@yeral/contract/catalog'
import { useFmt } from '@yeral/i18n'
import { Price } from '@yeral/ui/price'
import { Rating } from '@yeral/ui/rating'
import { CalendarDays, User } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { selectionTotal } from '@/features/pick-services'

type Service = BusinessDetail['serviceGroups'][number]['services'][number]

/**
 * The booking's card beside the steps from 1024 (Booking `.bside`): the business (its first photo, name, rating,
 * street), the picked services with their minutes and prices, the specialist and the chosen time once the flow is
 * past the services, the total with «Pay at the place», the step's primary and, while it's off, what it waits for.
 */
export function Summary({
  detail,
  picked,
  staff,
  date,
  time,
  showStaff,
  cta,
  hint,
}: {
  detail: BusinessDetail
  picked: readonly Service[]
  staff: string
  date: string | undefined
  time: number | null
  showStaff: boolean
  cta: ReactNode
  hint: string | null
}) {
  const t = useTranslations('booking')
  const fmt = useFmt()
  const total = selectionTotal(picked)
  const photo = detail.photos[0]
  const staffName = detail.specialists.find((s) => s.id === staff)?.name ?? t('staff.any')
  return (
    <div className="flex flex-col gap-5 rounded-card border border-n-200 bg-n-0 p-6">
      <div className="flex items-center gap-3.5">
        {photo && <img src={photo.url} alt="" className="block size-14 flex-none rounded-s object-cover" />}
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[16px] leading-[22px] font-semibold">{detail.name}</span>
          {detail.rating !== null && detail.reviewsCount > 0 && (
            <Rating value={fmt.rating(detail.rating)} count={fmt.number(detail.reviewsCount)} className="text-dense [&_svg]:size-[13px]" />
          )}
          <span className="truncate text-dense text-n-600">{detail.address}</span>
        </div>
      </div>
      <div className="h-px bg-n-200" />
      <div className="flex flex-col gap-3.5">
        {picked.length === 0 && <span className="text-dense text-n-600">{t('summary.none')}</span>}
        {picked.map((s) => (
          <div key={s.id} className="flex items-start justify-between gap-4">
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-body font-medium">{s.name}</span>
              <span className="text-dense text-n-600">{fmt.duration(s.durationMin)}</span>
            </span>
            <Price hidden={s.price.type === 'hidden'}>{fmt.price(s.price)}</Price>
          </div>
        ))}
      </div>
      {showStaff && picked.length > 0 && (
        <div className="flex flex-col gap-2.5 text-small [&_svg]:mt-px [&_svg]:size-4.5 [&_svg]:flex-none [&_svg]:text-n-600">
          <div className="flex items-start gap-2.5">
            <User aria-hidden strokeWidth={1.75} />
            {staffName}
          </div>
          {date && time !== null && (
            <div className="flex items-start gap-2.5">
              <CalendarDays aria-hidden strokeWidth={1.75} />
              {t('summary.when', { date: fmt.weekdayDate(date), range: fmt.timeRange(time, time + total.minutes) })}
            </div>
          )}
        </div>
      )}
      <div className="h-px bg-n-200" />
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-body font-semibold">{t('summary.total')}</span>
          {picked.length > 0 && (
            <Price size="total" hidden={total.price.type === 'hidden'}>
              {fmt.price(total.price)}
            </Price>
          )}
        </div>
        <span className="text-dense text-n-600">{t('summary.payAtPlace')}</span>
      </div>
      {cta && (
        <div className="flex flex-col gap-2.5">
          {cta}
          {hint && <span className="text-center text-dense text-n-600">{hint}</span>}
        </div>
      )}
    </div>
  )
}

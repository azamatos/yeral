import { Link } from '@tanstack/react-router'
import type { BusinessDetail } from '@yeral/contract/catalog'
import { today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { useClock } from '@yeral/ui/clock'
import { Callout } from '@yeral/ui/callout'
import { cn } from '@yeral/ui/cn'
import { CalendarX2, Clock, Phone, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { nextFreeText } from '../model/when'
import type { BookingState } from './business-page'
import { FavouriteButton } from './favourite'

type Detail = BusinessDetail

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

/** The next free time on the card and the bar (`nextFreeText`). */
function useNextFree(next: Detail['nextFree']): string | null {
  const t = useTranslations('business.card')
  const fmt = useFmt()
  const now = useClock()
  return next && nextFreeText(next, today(now), fmt, (values) => t('at', values))
}

/**
 * How this business confirms (Venue v0.7 · C2 BookingCard): one Info callout, a clock for by hand (with the usual wait
 * when the business has one), a zap for at once. `compact` is the phone's one line at the top of the Services panel
 * (`.co.cp`: 10 / 12 around a 16 icon and one 14/20 line).
 */
export function ConfirmCallout({ detail, compact = false, className }: { detail: Detail; compact?: boolean; className?: string }) {
  const t = useTranslations('business.card.confirm')
  const fmt = useFmt()
  const instant = detail.confirmMode === 'instant'
  if (compact)
    return (
      <Callout tone="accent" size="compact" icon={instant ? <Zap aria-hidden /> : <Clock aria-hidden />} className={className}>
        {instant ? t('instantShort') : t('byHandShort', { name: detail.name })}
      </Callout>
    )
  const icon = instant ? <Zap aria-hidden /> : <Clock aria-hidden />
  const lead = instant
    ? t('instantLead')
    : detail.typicalConfirmMinutes
      ? t('byHandWithin', { time: fmt.duration(detail.typicalConfirmMinutes) })
      : t('byHandLead')
  return (
    <Callout tone="accent" icon={icon} title={instant ? t('instant') : t('byHand', { name: detail.name })} className={className}>
      {lead}
    </Callout>
  )
}

/** «Book» into the booking flow, which opens on its services step (a service's own Book on a row opens it on the specialist). */
function BookLink({ slug, children, disabled }: { slug: string; children: ReactNode; disabled: boolean }) {
  const lang = useLocale()
  if (disabled)
    return (
      <Button size="l" variant="primary" className="w-full" disabled>
        {children}
      </Button>
    )
  return (
    <Button asChild size="l" variant="primary" className="w-full">
      <Link to="/$lang/b/$slug/book" params={{ lang, slug }}>
        {children}
      </Link>
    </Button>
  )
}

/**
 * The sticky card beside the page (Venue v0.7 aside, ≥ 1024), the same in every state: the next free time, «Book» and
 * how the business confirms (nothing is picked on the page, C3); the call card for a client the business books by
 * phone only (C-11, Mobile 15: first on narrower screens); the paused card while online booking is off (C-09, States
 * 05). On an owner's preview nothing can be booked (Q-153): the buttons stay, disabled.
 */
export function BookingCard({ detail, state }: { detail: Detail; state: BookingState }) {
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
            <span className="text-[22px] leading-7 font-bold tracking-[-0.01em]">{fmt.phone(detail.phone)}</span>
            <CallLink phone={detail.phone} className="w-full" />
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
        </div>
      </div>
    )
  return (
    <div className={card}>
      {/* Venue v0.7 · C2 `.bkc`: Next free time, Book and how the business confirms */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-label text-n-500 uppercase">{t('card.nextFree')}</span>
          <span className={cn(next ? 'text-[22px] leading-7 font-semibold tracking-[-0.01em]' : 'text-body-l font-semibold text-n-600')}>
            {next ?? t('card.noFree')}
          </span>
        </div>
        <BookLink slug={detail.slug} disabled={state === 'preview'}>
          {t('card.book')}
        </BookLink>
        <ConfirmCallout detail={detail} />
      </div>
    </div>
  )
}

/**
 * The bar at the bottom under 1024 (Venue v0.7 `ActionBar`, Mobile 4): the next free time beside «Book», never
 * changing (a service's own Book on its row opens the booking instead); the business's name and number beside «Call»
 * for a phone-only client (Mobile 15) and while online booking is paused (States 05, with the heart).
 */
export function BookingBar({ detail, state }: { detail: Detail; state: BookingState }) {
  const t = useTranslations('business')
  const fmt = useFmt()
  const next = useNextFree(detail.nextFree)
  const bar = 'sticky bottom-0 z-10 flex items-center justify-between gap-4 border-t border-n-200 bg-n-0 px-6 py-3 md:hidden max-sm:px-4'
  if (state === 'phone-only' || state === 'paused')
    return (
      <div role="region" aria-label={t('card.label')} className={bar}>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-dense text-n-600">{detail.name}</span>
          <span className="text-[17px] leading-[22px] font-bold whitespace-nowrap">{fmt.phone(detail.phone)}</span>
        </div>
        <div className="flex flex-none gap-2">
          {state === 'paused' && <FavouriteButton slug={detail.slug} />}
          <CallLink phone={detail.phone} />
        </div>
      </div>
    )
  return (
    <div role="region" aria-label={t('card.label')} className={bar}>
      <div className="flex min-w-0 flex-col">
        <span className="text-dense text-n-600">{t('card.nextFree')}</span>
        <span className={cn('whitespace-nowrap', next ? 'text-[17px] leading-[22px] font-bold' : 'text-body font-semibold text-n-600')}>
          {next ?? t('card.noFree')}
        </span>
      </div>
      <div className="flex-none">
        <BookLink slug={detail.slug} disabled={state === 'preview'}>
          {t('card.book')}
        </BookLink>
      </div>
    </div>
  )
}

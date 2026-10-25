import type { BusinessDetail } from '@yeral/contract/catalog'
import { AMENITIES, type Amenity } from '@yeral/domain/model'
import { useFmt } from '@yeral/i18n'
import { directionsUrl, telHref } from '@yeral/lib/links'
import { Button } from '@yeral/ui/button'
import { useClock } from '@yeral/ui/clock'
import { cn } from '@yeral/ui/cn'
import { MapDot, MapFrame, MapMarker, MapPin } from '@yeral/ui/map-frame'
import { Pill } from '@yeral/ui/pill'
import { Car, CircleCheck, Clock, CreditCard, Info, MapPin as Place, Navigation, Phone, Snowflake, Wallet, Wifi } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { addressLine, confirmLine, weekRows } from '../model/when'
import { Section } from './sections'

/** An icon row (Venue `.ir`): 20 icon, 15/22 text, 12 apart. */
function Row({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-body text-n-900 [&>svg]:mt-px [&>svg]:size-5 [&>svg]:flex-none">
      {icon}
      {children}
    </div>
  )
}

function Part({ title, children, className }: { title: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <h3 className="m-0 text-[17px] leading-6 font-semibold text-n-900">{title}</h3>
      {children}
    </div>
  )
}

const AMENITY_ICONS: Record<Amenity, ReactNode> = {
  wifi: <Wifi aria-hidden strokeWidth={1.75} />,
  air_conditioning: <Snowflake aria-hidden strokeWidth={1.75} />,
  parking: <Car aria-hidden strokeWidth={1.75} />,
  card_payment: <CreditCard aria-hidden strokeWidth={1.75} />,
}

/**
 * Venue «Barada» (book C-06 step 5): the description, then the hours, the address with its map, «Directions» and
 * «Call», the amenities and the booking rules side by side as they fit (300 each), and how the business confirms.
 */
export function About({ detail }: { detail: BusinessDetail }) {
  const t = useTranslations('business.about')
  return (
    <Section id="about" title={t('title')}>
      {detail.about && <p className="m-0 max-w-160 text-[17px] leading-[26px] text-pretty text-n-900">{detail.about}</p>}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-10 pt-3">
        <Hours detail={detail} />
        <Address detail={detail} />
        <Amenities amenities={detail.amenities} />
        <Rules detail={detail} />
      </div>
      <Confirms detail={detail} />
    </Section>
  )
}

/**
 * The week (Venue «Iş wagty», COMPONENTS VenueHours): Monday to Sunday as the coming days have them, today in 600 with
 * «Today», a day ending at midnight as 24:00, a break as two stretches, a special day with its name.
 */
function Hours({ detail }: { detail: BusinessDetail }) {
  const t = useTranslations('business.about')
  const fmt = useFmt()
  const now = useClock()
  return (
    <Part title={t('hours')}>
      <div className="flex flex-col border-b border-n-200">
        {weekRows(detail, now, fmt).map((d) => (
          <div
            key={d.date}
            className={cn(
              'flex h-10 items-center justify-between gap-3 border-t border-n-200 text-body text-n-900',
              d.today && 'font-semibold',
            )}
          >
            <span className="inline-flex items-center gap-2">
              {fmt.weekday(d.date)}
              {d.today && <Pill tone="accent">{t('today')}</Pill>}
            </span>
            <span className="text-right tabular-nums">
              {d.hours ?? t('closed')}
              {d.special && ` · ${d.special}`}
            </span>
          </div>
        ))}
      </div>
    </Part>
  )
}

/**
 * The address (Venue «Salgy»): the map with the business's pin (a home-based one's approximate circle, no pin), the
 * address with its floor, entrance note and distance, then «Directions» (not to an approximate place) and «Call».
 */
function Address({ detail }: { detail: BusinessDetail }) {
  const t = useTranslations('business.about')
  const page = useTranslations('business')
  const card = useTranslations('business.card')
  const fmt = useFmt()
  const at = { lat: detail.geo.lat, lng: detail.geo.lng }
  // the server's render (and a computer) links Google Maps; a phone's press opens its own map app
  const google = directionsUrl(at, detail.name)
  return (
    <Part title={t('address')}>
      {/* the map is a picture of the address written under it; the pin names the place. A new page (a place nearby)
          makes a new map, so the zoom follows its kind of address too */}
      <MapFrame key={detail.slug} center={at} zoom={detail.geo.approximate ? 14 : 16} interactive={false} className="h-70 rounded-card">
        <MapMarker at={at}>
          {detail.geo.approximate ? (
            <span className="absolute size-37.5 -translate-1/2 rounded-pill border-[1.5px] border-a-500/45 bg-a-500/14" />
          ) : (
            <>
              <MapPin hot className="-translate-y-2.5">
                {detail.name}
              </MapPin>
              <MapDot />
            </>
          )}
        </MapMarker>
      </MapFrame>
      <Row icon={<Place aria-hidden strokeWidth={1.75} />}>
        <span className="flex flex-col">
          <span className="font-semibold">{addressLine(detail, fmt)}</span>
          {detail.entranceNote && <span className="text-dense text-n-600">{detail.entranceNote}</span>}
          {detail.distanceM !== null && (
            <span className="text-dense text-n-600">{page('away', { distance: fmt.distance(detail.distanceM) })}</span>
          )}
          {detail.hideExactAddress && <span className="text-dense text-n-600">{page('approximate')}</span>}
        </span>
      </Row>
      <div className="flex flex-wrap gap-2">
        {!detail.hideExactAddress && (
          <Button asChild size="s" variant="secondary">
            <a
              href={google}
              target="_blank"
              rel="noopener noreferrer"
              // the phone's own map app where there is one (book Q-108); the link is Google Maps for a computer
              onClick={(e) => {
                const own = directionsUrl(at, detail.name, navigator)
                if (own === google) return
                e.preventDefault()
                location.href = own
              }}
            >
              <Navigation aria-hidden />
              {t('directions')}
            </a>
          </Button>
        )}
        <Button asChild size="s" variant="secondary">
          <a href={telHref(detail.phone)} aria-label={card('callLabel', { phone: fmt.phone(detail.phone) })}>
            <Phone aria-hidden />
            <span className="tabular-nums">{fmt.phone(detail.phone)}</span>
          </a>
        </Button>
      </div>
    </Part>
  )
}

/**
 * The amenities the business has ticked (Venue «Amatlyklar»), each with its icon, in the settings' order; a key this
 * app doesn't know yet is left out.
 */
function Amenities({ amenities }: { amenities: readonly string[] }) {
  const t = useTranslations('business.about')
  const known = AMENITIES.filter((a) => amenities.includes(a))
  if (known.length === 0) return null
  return (
    <Part title={t('amenities')} className="gap-4">
      <div className="flex flex-col gap-3.5">
        {known.map((a) => (
          <Row key={a} icon={AMENITY_ICONS[a]}>
            {t(`amenity.${a}`)}
          </Row>
        ))}
      </div>
    </Part>
  )
}

/**
 * The booking rules (Venue «Ýazylyş düzgünleri»): until when a booking can be cancelled or changed for free, the late
 * limit, paying at the place (by card too when the business takes cards), and the business's own note.
 */
function Rules({ detail }: { detail: BusinessDetail }) {
  const t = useTranslations('business.about')
  const fmt = useFmt()
  const { cancelWindowMinutes: window, lateToleranceMinutes: late, note } = detail.rules
  return (
    <Part title={t('rules')} className="gap-4">
      <div className="flex flex-col gap-3.5">
        <Row icon={<Clock aria-hidden strokeWidth={1.75} />}>
          {window ? t('cancelBefore', { time: fmt.duration(window) }) : t('cancelAnyTime')}
        </Row>
        <Row icon={<Info aria-hidden strokeWidth={1.75} />}>{t('late', { time: fmt.duration(late) })}</Row>
        <Row icon={<Wallet aria-hidden strokeWidth={1.75} />}>
          {detail.amenities.includes('card_payment') ? t('payCashOrCard') : t('pay')}
        </Row>
        {note && <Row icon={<Info aria-hidden strokeWidth={1.75} />}>{note}</Row>}
      </div>
    </Part>
  )
}

/** How the business answers (Venue's box under the rules, book Q-113): within its usual time, by hand, or at once. */
function Confirms({ detail }: { detail: BusinessDetail }) {
  const t = useTranslations('business.about')
  const card = useTranslations('business.card')
  const fmt = useFmt()
  const instant = detail.confirmMode === 'instant'
  return (
    <div className="mt-3 flex items-start gap-3 rounded-m bg-n-50 px-5 py-4">
      <CircleCheck aria-hidden className="mt-px size-5 flex-none text-st-completed-ink" strokeWidth={1.75} />
      <span className="flex flex-col gap-0.5">
        <span className="text-body font-semibold text-n-900">{confirmLine(detail, fmt, card)}</span>
        <span className="text-dense text-n-600">{instant ? t('atOnce') : t('byHand', { name: detail.name })}</span>
      </span>
    </div>
  )
}

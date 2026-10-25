import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import type { BusinessDetail } from '@yeral/contract/catalog'
import { today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { useSdk } from '@yeral/sdk/react'
import { Breadcrumbs, Crumb } from '@yeral/ui/breadcrumbs'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { useClock } from '@yeral/ui/clock'
import { cn } from '@yeral/ui/cn'
import { ExampleBadge } from '@yeral/ui/example-badge'
import { Pill } from '@yeral/ui/pill'
import { Rating } from '@yeral/ui/rating'
import { textLink } from '@yeral/ui/text-link'
import { toast } from '@yeral/ui/toast'
import { Clock, MapPin, Share2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { parseServiceIds, pickedServices, ServicePicker, serviceIdsParam, SERVICES_MAX, toggleService } from '@/features/pick-services'
import { site } from '@/shared/config'
import { wrap } from '@/shared/ui'
import { addressLine, openLine } from '../model/when'
import { About } from './about'
import { BookingBar, BookingCard } from './booking-card'
import { FavouriteButton } from './favourite'
import { Nearby } from './nearby'
import { Reviews } from './reviews'
import { goTo, Section, SECTIONS, SectionNav } from './sections'
import { Specialists } from './specialists'

/**
 * How the page can be booked by whoever looks: `online` (Select and Book), `preview` (the owner's own page in review:
 * shown, nothing bookable, Q-153), `paused` (online booking off: the call card, C-09) and `phone-only` (a client the
 * business books by phone: the call card, C-11).
 */
export type BookingState = 'online' | 'preview' | 'paused' | 'phone-only'

export function bookingState(detail: Pick<BusinessDetail, 'preview' | 'onlineEnabled' | 'bookOnline'>): BookingState {
  if (detail.preview) return 'preview'
  if (!detail.onlineEnabled) return 'paused'
  return detail.bookOnline ? 'online' : 'phone-only'
}

/**
 * `/{lang}/b/{slug}` — the business page (Venue, book C-06–C-11, C-15): the header with the photos; under the section
 * nav the services to pick from (kept in `?services=`), the specialists, the reviews and About, with the booking card
 * beside them (a bar under 1024); the places nearby across the foot. The route's loader has the page (and the first
 * reviews) in the cache, or has already turned an unknown, hidden or not yet open business into the 404 page (C-10).
 */
export function BusinessPage() {
  const { slug = '' } = useParams({ strict: false })
  const lang = useLocale()
  const sdk = useSdk()
  const { data: detail } = useSuspenseQuery(sdk.catalog.business(slug, lang))
  const search: { services?: string } = useSearch({ strict: false })
  const navigate = useNavigate()
  const t = useTranslations('business')
  const tb = useTranslations('booking')
  const state = bookingState(detail)
  // a page with nobody to pick (tables, classes) has no Specialists part
  const sections = SECTIONS.filter((s) => s !== 'specialists' || detail.specialists.length > 0)
  const ids = state === 'online' || state === 'preview' ? parseServiceIds(search.services) : []
  const picked = pickedServices(detail, ids)
  const pick = (next: string[]) =>
    void navigate({
      to: '.',
      search: (prev: Record<string, unknown>) => ({ ...prev, services: serviceIdsParam(next) }),
      replace: true,
      resetScroll: false,
    })
  return (
    <>
      {detail.preview && <PreviewBanner preview={detail.preview} />}
      <div className={wrap}>
        <Header detail={detail} />
        <div className="flex flex-wrap items-stretch gap-12 pt-10 max-sm:pt-6">
          <div className="min-w-0 flex-[999_1_540px]">
            <SectionNav ids={sections} />
            {/* Venue «Hyzmatlar» (`.sect.first`) */}
            <Section id="services" title={t('services.title')} first>
              <ServicePicker
                groups={detail.serviceGroups}
                picked={picked.map((s) => s.id)}
                onToggle={(id) => {
                  const next = toggleService(ids, id)
                  // one booking takes up to 10 services (the api's limit)
                  if (next.length > SERVICES_MAX) toast(tb('services.max', { max: SERVICES_MAX }))
                  else pick(next)
                }}
                canPick={state === 'online' || state === 'preview'}
                groupHeading="h3"
              />
            </Section>
            {detail.specialists.length > 0 && <Specialists detail={detail} state={state} picked={picked.map((s) => s.id)} />}
            <Reviews detail={detail} />
            <About detail={detail} />
          </div>
          <aside
            aria-label={t('card.label')}
            className={cn('min-w-0 flex-[1_1_340px]', state === 'phone-only' ? 'max-md:order-first max-md:basis-full' : 'max-md:hidden')}
          >
            <BookingCard
              detail={detail}
              state={state}
              picked={picked}
              onRemove={(id) => pick(ids.filter((x) => x !== id))}
              onClear={() => pick([])}
            />
          </aside>
        </div>
      </div>
      <Nearby places={detail.similar} />
      <BookingBar detail={detail} state={state} picked={picked} />
    </>
  )
}

/** The owner's own page while Ýeral checks it, or after it said no or hid it (Venue `ownerPreview`, Q-274). */
function PreviewBanner({ preview }: { preview: NonNullable<BusinessDetail['preview']> }) {
  const t = useTranslations('business.preview')
  const brand = useTranslations('common')('brand')
  const b = (chunks: ReactNode) => <b>{chunks}</b>
  const text =
    preview.status === 'pending'
      ? t.rich('pending', { b })
      : preview.status === 'rejected'
        ? preview.reason
          ? t.rich('rejected', { b, reason: preview.reason })
          : t.rich('rejectedNoReason', { b, brand })
        : preview.reason
          ? t.rich('hidden', { b, brand, reason: preview.reason })
          : t.rich('hiddenNoReason', { b, brand })
  return (
    <Callout layout="banner" tone={preview.status === 'pending' ? 'warning' : 'danger'} icon={<Clock />}>
      {text}
    </Callout>
  )
}

/**
 * The header (Venue `.hero`): the path, the name with «Example» for a sample business and its line, the rating,
 * reviews, category and open state, the address, the heart and Share; then the photos (one large and four small; one
 * at a time on phones, first on the page, with its count).
 */
function Header({ detail }: { detail: BusinessDetail }) {
  const t = useTranslations('business')
  const home = useTranslations('notFound')('home')
  const fmt = useFmt()
  const lang = useLocale()
  const brand = useTranslations('common')('brand')
  const now = useClock()
  const open = openLine(detail.open, today(now), fmt, t)
  return (
    <div className="flex flex-col gap-5 pt-6 max-sm:gap-4 max-sm:pt-0">
      <Breadcrumbs label={t('crumbs')} className="max-sm:hidden">
        <Crumb asChild>
          <Link to="/$lang" params={{ lang }}>
            {home}
          </Link>
        </Crumb>
        <span>{detail.category.name}</span>
        <Crumb current>{detail.name}</Crumb>
      </Breadcrumbs>
      <div className="flex items-end justify-between gap-x-6 gap-y-4 max-sm:flex-col max-sm:items-start">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-[40px] leading-11 font-bold tracking-[-0.03em] max-sm:text-[30px] max-sm:leading-9">
            {detail.name}
            {detail.example && (
              <>
                <span className="sr-only">, </span>
                <ExampleBadge>{t('example')}</ExampleBadge>
              </>
            )}
          </h1>
          <div className="flex flex-col gap-1 text-body text-n-600">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {detail.rating !== null && detail.reviewsCount > 0 ? (
                <>
                  <Rating value={fmt.rating(detail.rating)} />
                  <span aria-hidden>·</span>
                  <a href="#reviews" onClick={goTo('reviews')} className={cn(textLink, 'font-medium')}>
                    {t('reviews', { count: detail.reviewsCount })}
                  </a>
                </>
              ) : (
                <span>{t('noReviews')}</span>
              )}
              <span aria-hidden>·</span>
              <span>{detail.category.name}</span>
              <span aria-hidden>·</span>
              <span className={cn('font-semibold', open.isOpen ? 'text-st-completed-ink' : 'text-n-600')}>{open.text}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <MapPin aria-hidden className="size-4 flex-none" strokeWidth={1.75} />
              <span>
                {addressLine(detail, fmt)}
                {detail.distanceM !== null && ` · ${t('away', { distance: fmt.distance(detail.distanceM) })}`}
              </span>
              {/* the api sends when it moved only for the 30 days the page says so (book Q-215) */}
              {detail.movedAt !== null && <Pill tone="accent">{t('newAddress')}</Pill>}
            </div>
            {detail.hideExactAddress && <span className="text-dense">{t('approximate')}</span>}
          </div>
        </div>
        <div className="flex flex-none gap-2">
          {/* the owner's page in review isn't public: nothing to keep among favourites */}
          {!detail.preview && <FavouriteButton slug={detail.slug} />}
          <ShareButton name={detail.name} slug={detail.slug} />
        </div>
      </div>
      {detail.example && (
        <Callout tone="neutral" size="s">
          {detail.confirmMode === 'instant' ? t('exampleInstant', { brand }) : t('exampleManual', { brand })}
        </Callout>
      )}
      <Gallery photos={detail.photos} />
    </div>
  )
}

/**
 * Share (Venue): the phone's share sheet where there is one, else the link copied, with a toast; a sheet closed by the
 * person is no error, and anything that fails says so.
 */
function ShareButton({ name, slug }: { name: string; slug: string }) {
  const t = useTranslations('business.share')
  const lang = useLocale()
  const share = async () => {
    const url = `${site.urls.client}/${lang}/b/${slug}`
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: name, url })
        return
      }
      await navigator.clipboard.writeText(url)
      toast(t('copied'))
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) toast(t('failed'))
    }
  }
  return (
    <Button variant="secondary" iconOnly aria-label={t('label')} onClick={() => void share()}>
      <Share2 aria-hidden />
    </Button>
  )
}

/**
 * The photos (Venue `.gal`): one large and up to four beside it, 440 high, r16; under 768 the first alone, full width
 * and square-cornered, with «1 / 5». Fewer photos keep the large one and stack the rest; none, no gallery.
 */
function Gallery({ photos }: { photos: BusinessDetail['photos'] }) {
  const t = useTranslations('business')
  const [first, ...rest] = photos
  if (!first) return null
  const small = rest.slice(0, 4)
  return (
    <div className="relative max-sm:order-first max-sm:-mx-4">
      <div
        className={cn(
          'grid h-110 gap-2 overflow-hidden rounded-card max-sm:h-70 max-sm:grid-cols-1 max-sm:rounded-none',
          small.length === 0 ? 'grid-cols-1' : small.length < 4 ? 'grid-cols-[2fr_1fr]' : 'grid-cols-[2fr_1fr_1fr] grid-rows-2',
        )}
        // fewer than four small photos stack beside the large one, one row each
        style={small.length > 0 && small.length < 4 ? { gridTemplateRows: `repeat(${small.length}, minmax(0, 1fr))` } : undefined}
      >
        <img
          src={first.url}
          alt={first.alt}
          className="size-full object-cover"
          style={small.length > 0 ? { gridRow: `span ${small.length < 4 ? small.length : 2}` } : undefined}
        />
        {small.map((p) => (
          <img key={p.url} src={p.url} alt={p.alt} loading="lazy" className="size-full object-cover max-sm:hidden" />
        ))}
      </div>
      {photos.length > 1 && (
        <span className="absolute right-4 bottom-4 hidden h-7 items-center rounded-pill bg-n-0 px-2.5 text-dense font-semibold text-n-900 max-sm:inline-flex">
          <span aria-hidden>{t('photoOf', { n: 1, total: photos.length })}</span>
          <span className="sr-only">{t('photoCount', { n: 1, total: photos.length })}</span>
        </span>
      )}
    </div>
  )
}

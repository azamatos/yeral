import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import type { BusinessDetail } from '@yeral/contract/catalog'
import { useSdk } from '@yeral/sdk/react'
import { Breadcrumbs, Crumb } from '@yeral/ui/breadcrumbs'
import { Callout } from '@yeral/ui/callout'
import { cn } from '@yeral/ui/cn'
import { toast } from '@yeral/ui/toast'
import { Clock } from 'lucide-react'
import type { ReactNode } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { parseServiceIds, pickedServices, ServicePicker, serviceIdsParam, SERVICES_MAX, toggleService } from '@/features/pick-services'
import { wrap } from '@/shared/ui'
import { About } from './about'
import { BookingBar, BookingCard, ConfirmCallout } from './booking-card'
import { Hero } from './hero'
import { Nearby } from './nearby'
import { Reviews } from './reviews'
import { pickTab, Section, SECTIONS, SectionTabs } from './sections'
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
 * `/{lang}/b/{slug}` — the business page (Venue v0.7 · C2, book C-06–C-11, C-15): the breadcrumbs, the cover hero with
 * the identity on the photo; under it the tabs as panels (`?tab=`): the services to pick from (kept in `?services=`),
 * the specialists, the reviews and About, with the booking card beside them (a bar under 1024); the places nearby
 * across the foot. The route's loader has the page (and the first
 * reviews) in the cache, or has already turned an unknown, hidden or not yet open business into the 404 page (C-10).
 */
export function BusinessPage() {
  const { slug = '' } = useParams({ strict: false })
  const lang = useLocale()
  const sdk = useSdk()
  const { data: detail } = useSuspenseQuery(sdk.catalog.business(slug, lang))
  const search: { services?: string; tab?: string } = useSearch({ strict: false })
  const navigate = useNavigate()
  const t = useTranslations('business')
  const tb = useTranslations('booking')
  const home = useTranslations('notFound')('home')
  const state = bookingState(detail)
  // a page with nobody to pick (tables, classes) has no Specialists part
  const sections = SECTIONS.filter((s) => s !== 'specialists' || detail.specialists.length > 0)
  const tab = pickTab(search.tab, sections)
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
        <Breadcrumbs label={t('crumbs')} className="pt-6 max-md:hidden">
          <Crumb asChild>
            <Link to="/$lang" params={{ lang }}>
              {home}
            </Link>
          </Crumb>
          <Crumb asChild>
            <Link to="/$lang/c/$category" params={{ lang, category: detail.category.id }}>
              {detail.category.name}
            </Link>
          </Crumb>
          <Crumb current>{detail.name}</Crumb>
        </Breadcrumbs>
        <Hero detail={detail} />
        <div className="flex flex-wrap items-stretch gap-12 pt-4 max-md:pt-0">
          <div className="min-w-0 flex-[999_1_540px]">
            <SectionTabs
              ids={sections}
              current={tab}
              label={detail.name}
              belowBar={detail.photos.length > 0}
              counts={{
                services: detail.serviceGroups.reduce((n, g) => n + g.services.length, 0),
                specialists: detail.specialists.length,
                reviews: detail.reviewsCount,
              }}
            >
              {{
                services: (
                  <Section id="services" title={t('services.title')}>
                    {/* the phone has no card: how the business confirms opens the panel in one line (C2) */}
                    {(state === 'online' || state === 'preview') && <ConfirmCallout detail={detail} compact className="md:hidden" />}
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
                ),
                specialists: <Specialists detail={detail} state={state} picked={picked.map((s) => s.id)} />,
                reviews: <Reviews detail={detail} />,
                about: <About detail={detail} />,
              }}
            </SectionTabs>
          </div>
          <aside
            aria-label={t('card.label')}
            className={cn(
              'min-w-0 flex-[1_1_340px] pt-4',
              state === 'phone-only' ? 'max-md:order-first max-md:basis-full max-md:pt-0' : 'max-md:hidden',
            )}
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

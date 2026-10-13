import { AtSign, ChevronRight, Navigation, Phone } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { api } from '@/api'
import { makeFmt } from '@/lib/format'
import { directionsUrl } from '@/lib/links'
import { BookingCard, ChannelMarker, Gallery, HeaderActions, Hours, MiniMap, OpenNow, ReviewsList, SectionTabs, ServicesSection, TeamLink } from '@/components/salon/parts'
import { SalonCard } from '@/components/site/salon-card'
import { Note, RatingInline, Tag } from '@/components/ui/bits'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const s = await api.catalog.salon(slug)
  const t = await getTranslations('meta')
  if (!s) return {}
  return {
    title: t('salonTitle', { name: s.name, kind: s.kind, district: s.district }),
    description: t('salonDescription', { name: s.name, kind: s.kind.toLowerCase(), district: s.district, address: s.address, rating: s.rating.avg.toFixed(1).replace('.', ','), count: s.rating.count, price: s.minPrice }),
    alternates: { canonical: `/${s.slug}` },
    openGraph: { title: s.name, images: [{ url: s.photos[0] }] },
  }
}

/** schema.org for search engines: a beauty business with its menu, rating and a booking action. */
function jsonLd(s: NonNullable<Awaited<ReturnType<typeof api.catalog.salon>>>) {
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const hm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  return {
    '@context': 'https://schema.org',
    '@type': s.categories.includes('barber') ? 'HairSalon' : s.categories.includes('nails') ? 'NailSalon' : s.categories.includes('massage') ? 'DaySpa' : 'BeautySalon',
    name: s.name,
    url: `https://yeral.app/${s.slug}`,
    image: s.photos.map((p) => `https://yeral.app${p}`),
    telephone: s.phone,
    address: { '@type': 'PostalAddress', streetAddress: s.address, addressLocality: 'Ашхабад', addressCountry: 'TM' },
    geo: { '@type': 'GeoCoordinates', latitude: s.geo.lat, longitude: s.geo.lng },
    aggregateRating: { '@type': 'AggregateRating', ratingValue: s.rating.avg, reviewCount: s.rating.count },
    priceRange: `${s.minPrice}+ TMT`,
    openingHoursSpecification: s.hours.flatMap((h, i) => (h ? [{ '@type': 'OpeningHoursSpecification', dayOfWeek: DAYS[i], opens: hm(h.open), closes: hm(h.close) }] : [])),
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Услуги',
      itemListElement: s.menu.map((x) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: x.name }, price: x.price, priceCurrency: 'TMT' })),
    },
    potentialAction: s.online ? { '@type': 'ReserveAction', target: `https://yeral.app/${s.slug}/book` } : undefined,
  }
}

export default async function SalonPage({ params }: Props) {
  const { slug } = await params
  const s = await api.catalog.salon(slug)
  if (!s) notFound()
  const [reviews, similar] = await Promise.all([api.catalog.reviews(s.id), api.catalog.similar(s.id)])
  const t = await getTranslations()
  const f = makeFmt('ru', await getTranslations('common'))
  const tabs = [
    { id: 'services', label: t('salon.tabServices') },
    { id: 'team', label: t('salon.tabTeam') },
    { id: 'reviews', label: t('salon.tabReviews') },
    { id: 'about', label: t('salon.tabAbout') },
  ]
  const h2 = 'mb-5 text-[24px] font-bold tracking-[-0.02em]'

  return (
    <div className="mx-auto max-w-[1240px] px-4 pb-28 md:px-6 lg:pb-0">
      <ChannelMarker slug={s.slug} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(s)) }} />

      {/* breadcrumbs */}
      <nav className="hidden items-center gap-1.5 pt-5 text-[13px] text-ink-3 md:flex" aria-label="breadcrumbs">
        <Link href="/" className="hover:text-ink">{t('salon.breadcrumbHome')}</Link>
        <ChevronRight size={14} />
        <Link href={`/search?category=${s.categories[0]}`} className="hover:text-ink">{t(`categories.${s.categories[0]}`)}</Link>
        <ChevronRight size={14} />
        <Link href={`/search?district=${s.districtId}`} className="hover:text-ink">{s.district}</Link>
        <ChevronRight size={14} />
        <span className="text-ink-2">{s.name}</span>
      </nav>

      <div className="mt-0 md:mt-4">
        <Gallery s={s} />
      </div>

      <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[30px] font-bold leading-tight tracking-[-0.03em] md:text-[40px]">{s.name}</h1>
            {s.isNew && <Tag>{t('common.new')}</Tag>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14.5px] text-ink-2">
            <RatingInline avg={f.rating(s.rating.avg)} count={t('common.reviews', { count: s.rating.count })} className="text-ink" />
            <span>·</span>
            <span>{s.kind}</span>
            <span>·</span>
            <OpenNow s={s} />
            <span>·</span>
            <a href={directionsUrl(s)} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
              {s.district}, {s.address}
            </a>
          </div>
        </div>
        <HeaderActions s={s} />
      </div>

      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0">
          <SectionTabs items={tabs} />

          <section id="services" className="scroll-mt-32 pt-8">
            <h2 className={h2}>{t('salon.tabServices')}</h2>
            {!s.online && (
              <Note tone="amber" className="mb-4">
                <b className="block">{t('salon.offlineTitle')}</b>
                {t('salon.offlineText')}
              </Note>
            )}
            <ServicesSection s={s} />
          </section>

          <section id="team" className="scroll-mt-32 pt-14">
            <h2 className={h2}>{t('salon.tabTeam')}</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {s.staff.map((st) => (
                <TeamLink key={st.id} slug={s.slug} id={st.id} name={st.name} spec={st.spec} rating={f.rating(st.rating)} />
              ))}
            </div>
          </section>

          <section id="reviews" className="scroll-mt-32 pt-14">
            <h2 className={h2}>{t('salon.tabReviews')}</h2>
            <ReviewsList s={s} initial={reviews} />
          </section>

          <section id="about" className="scroll-mt-32 pt-14">
            <h2 className={h2}>{t('salon.tabAbout')}</h2>
            <p className="max-w-[680px] text-[15.5px] leading-relaxed">{s.about}</p>
            {s.amenities.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {s.amenities.map((a) => (
                  <span key={a} className="rounded-full bg-group px-3.5 py-1.5 text-[13.5px] font-medium">
                    {t(`amenities.${a}` as 'amenities.wifi')}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-8 grid gap-8 md:grid-cols-2">
              <div>
                <MiniMap s={s} />
                <div className="mt-3 text-[15px] font-semibold">
                  {s.address}, {t('common.city')}
                </div>
                <div className="text-[14px] text-ink-2">{s.district}</div>
                {s.entrance && <div className="mt-1 text-[14px] text-ink-2">{t('salon.entrance', { text: s.entrance })}</div>}
                <a href={directionsUrl(s)} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-[14px] font-semibold text-acc-ink hover:underline">
                  <Navigation size={16} strokeWidth={1.75} />
                  {t('salon.directions')}
                </a>
              </div>
              <div>
                <div className="mb-2 text-[13px] font-semibold uppercase tracking-[0.07em] text-ink-3">{t('salon.hours')}</div>
                <Hours s={s} />
                <div className="mb-2 mt-6 text-[13px] font-semibold uppercase tracking-[0.07em] text-ink-3">{t('salon.contacts')}</div>
                <a href={`tel:${s.phone.replace(/\s/g, '')}`} className="flex items-center gap-2 py-1 text-[15px] hover:underline">
                  <Phone size={16} strokeWidth={1.75} className="text-ink-3" />
                  {s.phone}
                </a>
                {s.instagram && (
                  <span className="flex items-center gap-2 py-1 text-[15px]">
                    <AtSign size={16} strokeWidth={1.75} className="text-ink-3" />
                    {s.instagram}
                  </span>
                )}
                <Note className="mt-5">{t('salon.cancelPolicy', { hours: s.cancelHours })}</Note>
              </div>
            </div>
          </section>
        </div>

        <aside>
          <BookingCard s={s} />
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="pt-16">
          <h2 className={h2}>{t('salon.similar')}</h2>
          <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((x) => (
              <SalonCard key={x.id} s={x} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

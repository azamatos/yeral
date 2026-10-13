import { CalendarCheck, MapPin, MousePointerClick, Store } from 'lucide-react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { api } from '@/api'
import { DISTRICTS } from '@/domain/places'
import { FreeToday } from '@/components/home/free-today'
import { CatalogMarker } from '@/components/salon/parts'
import { CATEGORY_ORDER, CategoryIcon } from '@/components/site/category-icon'
import { SalonCard } from '@/components/site/salon-card'
import { SearchBar } from '@/components/site/search-bar'
import { ButtonLink } from '@/components/ui/button'
import { Rail, RailItem } from '@/components/ui/rail'

/** Lists depend on today's date (new salons, ratings) — render per request until real caching lands. */
export const dynamic = 'force-dynamic'

export default async function Home() {
  const t = await getTranslations()
  const { items } = await api.catalog.search({ sort: 'recommended' })
  const recommended = items.filter((x) => x.online).slice(0, 8)
  const fresh = items.filter((x) => x.isNew)
  const countByDistrict = Object.fromEntries(DISTRICTS.map((d) => [d.id, items.filter((x) => x.districtId === d.id).length]))

  return (
    <>
      <CatalogMarker />
      {/* hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(1200px_480px_at_15%_-10%,#e9e4ff_0%,transparent_60%),radial-gradient(900px_420px_at_95%_10%,#fbe9f5_0%,transparent_55%)]" />
        <div className="mx-auto max-w-[1240px] px-4 pb-10 pt-10 md:px-6 md:pb-16 md:pt-20">
          <h1 className="max-w-[760px] text-[34px] font-bold leading-[1.08] tracking-[-0.035em] md:text-[56px]">{t('home.title')}</h1>
          <p className="mt-4 max-w-[620px] text-[16px] leading-relaxed text-ink-2 md:text-[18px]">{t('home.subtitle')}</p>
          <SearchBar className="mt-8 max-w-[980px]" />
          <div className="no-scrollbar -mx-4 mt-8 flex gap-2.5 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
            {CATEGORY_ORDER.map((c) => (
              <Link key={c} href={`/search?category=${c}`} className="flex h-11 flex-none items-center gap-2 rounded-full border border-line bg-white/80 px-4 text-[14.5px] font-medium backdrop-blur hover:border-line-2 hover:bg-white">
                <CategoryIcon id={c} size={18} className="text-acc" />
                {t(`categories.${c}`)}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-14 md:gap-20">
        <FreeToday />

        <section className="mx-auto w-full max-w-[1240px] px-4 md:px-6">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-[22px] font-bold tracking-[-0.02em] md:text-[26px]">{t('home.recommended')}</h2>
              <p className="mt-0.5 text-[14px] text-ink-2">{t('home.recommendedSub')}</p>
            </div>
            <ButtonLink href="/search" variant="outline" size="sm" pill>
              {t('home.seeAllSalons')}
            </ButtonLink>
          </div>
          <div className="grid gap-x-5 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
            {recommended.map((s) => (
              <SalonCard key={s.id} s={s} />
            ))}
          </div>
        </section>

        {fresh.length > 0 && (
          <Rail title={t('home.newOnYeral')} sub={t('home.newOnYeralSub')}>
            {fresh.map((s) => (
              <RailItem key={s.id}>
                <SalonCard s={s} compact />
              </RailItem>
            ))}
          </Rail>
        )}

        {/* how it works */}
        <section className="mx-auto w-full max-w-[1240px] px-4 md:px-6">
          <h2 className="text-[22px] font-bold tracking-[-0.02em] md:text-[26px]">{t('home.howTitle')}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              { i: MousePointerClick, title: t('home.how1t'), text: t('home.how1') },
              { i: CalendarCheck, title: t('home.how2t'), text: t('home.how2') },
              { i: MapPin, title: t('home.how3t'), text: t('home.how3') },
            ].map(({ i: I, title, text }, n) => (
              <div key={n} className="rounded-card border border-line p-6">
                <div className="flex size-11 items-center justify-center rounded-xl bg-acc-tint text-acc">
                  <I size={22} strokeWidth={1.75} />
                </div>
                <div className="mt-4 text-[17px] font-semibold">{title}</div>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-2">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* business CTA */}
        <section className="mx-auto w-full max-w-[1240px] px-4 md:px-6">
          <div className="flex flex-col items-start gap-6 overflow-hidden rounded-[24px] bg-ink p-8 text-white md:flex-row md:items-center md:p-12">
            <div className="flex size-14 flex-none items-center justify-center rounded-2xl [background:var(--grad)]">
              <Store size={28} strokeWidth={1.75} />
            </div>
            <div className="flex-1">
              <h2 className="text-[24px] font-bold tracking-[-0.02em] md:text-[30px]">{t('home.bizTitle')}</h2>
              <p className="mt-2 max-w-[620px] text-[15.5px] leading-relaxed text-white/70">{t('home.bizText')}</p>
            </div>
            <ButtonLink href="/for-business" size="lg" variant="primary">
              {t('home.bizCta')}
            </ButtonLink>
          </div>
        </section>

        {/* districts */}
        <section className="mx-auto w-full max-w-[1240px] px-4 md:px-6">
          <h2 className="text-[22px] font-bold tracking-[-0.02em] md:text-[26px]">{t('home.byDistrict')}</h2>
          <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {DISTRICTS.map((d) => (
              <Link key={d.id} href={`/search?district=${d.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-line px-4 py-3.5 hover:bg-group-2">
                <span className="flex items-center gap-2 font-medium">
                  <MapPin size={16} strokeWidth={1.75} className="text-ink-3" />
                  {d.name}
                </span>
                <span className="text-[13px] text-ink-3">{t('common.salons', { count: countByDistrict[d.id] })}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}

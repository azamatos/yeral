import { BarChart3, CalendarDays, Check, Link2, Users } from 'lucide-react'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { ButtonLink } from '@/components/ui/button'
import { Note } from '@/components/ui/bits'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('biz')
  return { title: t('title'), description: t('heroText') }
}

/** Phase 3 grows this into the full landing + salon sign-up; for now it explains the offer from the product deck. */
export default async function ForBusiness() {
  const t = await getTranslations('biz')
  const features = [
    { i: CalendarDays, title: t('f1t'), text: t('f1') },
    { i: Link2, title: t('f2t'), text: t('f2') },
    { i: BarChart3, title: t('f3t'), text: t('f3') },
  ]
  const plans = [
    { title: t('p1t'), price: t('p1'), text: t('p1d') },
    { title: t('p2t'), price: t('p2'), text: t('p2d'), accent: true },
    { title: t('p3t'), price: t('p3'), text: t('p3d') },
  ]
  return (
    <>
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-[1240px] px-4 py-16 md:px-6 md:py-24">
          <div className="text-[14px] font-semibold text-acc-300">{t('title')}</div>
          <h1 className="mt-3 max-w-[820px] text-[36px] font-bold leading-[1.08] tracking-[-0.035em] md:text-[56px]">{t('hero')}</h1>
          <p className="mt-5 max-w-[620px] text-[17px] leading-relaxed text-white/70">{t('heroText')}</p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <ButtonLink href="mailto:hello@yeral.app?subject=Подключить салон" size="lg">{t('cta')}</ButtonLink>
            <span className="text-[14px] text-white/50">{t('soon')}</span>
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-[1240px] gap-4 px-4 py-16 md:grid-cols-3 md:px-6">
        {features.map(({ i: I, title, text }) => (
          <div key={title} className="rounded-card border border-line p-6">
            <div className="flex size-11 items-center justify-center rounded-xl bg-acc-tint text-acc"><I size={22} strokeWidth={1.75} /></div>
            <div className="mt-4 text-[18px] font-semibold">{title}</div>
            <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{text}</p>
          </div>
        ))}
      </section>
      <section id="pricing" className="mx-auto max-w-[1240px] scroll-mt-24 px-4 md:px-6">
        <h2 className="text-[28px] font-bold tracking-[-0.03em]">{t('pricingTitle')}</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {plans.map((p) => (
            <div key={p.title} className={p.accent ? 'rounded-card border-2 border-acc p-6' : 'rounded-card border border-line p-6'}>
              <div className="flex items-center gap-2 text-[14px] font-semibold text-acc-ink">{p.accent ? <Users size={17} /> : <Check size={17} />}{p.title}</div>
              <div className="mt-3 text-[22px] font-bold tracking-[-0.02em]">{p.price}</div>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{p.text}</p>
            </div>
          ))}
        </div>
        <Note className="mt-4">{t('priceSoon')}</Note>
      </section>
    </>
  )
}

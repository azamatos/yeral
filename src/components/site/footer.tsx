import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { CATEGORY_ORDER } from './category-icon'
import { Logo } from './logo'

export function SiteFooter() {
  const t = useTranslations()
  const year = new Date().getFullYear()
  const col = 'flex flex-col gap-2.5 text-[14px]'
  const head = 'mb-1 text-[12px] font-semibold uppercase tracking-[0.07em] text-ink-3'
  const a = 'text-ink-2 hover:text-ink'
  return (
    <footer className="mt-20 border-t border-line bg-group-2 pb-24 md:pb-0">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-4 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-6">
        <div className="flex flex-col gap-3">
          <Logo className="h-8" />
          <p className="max-w-[260px] text-[14px] text-ink-2">{t('footer.tagline')}</p>
        </div>
        <div className={col}>
          <div className={head}>{t('footer.clients')}</div>
          <Link className={a} href="/search">{t('footer.search')}</Link>
          {CATEGORY_ORDER.slice(0, 4).map((c) => (
            <Link key={c} className={a} href={`/search?category=${c}`}>{t(`categories.${c}`)}</Link>
          ))}
          <Link className={a} href="/account/bookings">{t('footer.myBookings')}</Link>
        </div>
        <div className={col}>
          <div className={head}>{t('footer.business')}</div>
          <Link className={a} href="/for-business">{t('footer.forBusiness')}</Link>
          <Link className={a} href="/for-business#pricing">{t('footer.pricing')}</Link>
        </div>
        <div className={col}>
          <div className={head}>{t('footer.company')}</div>
          <Link className={a} href="/for-business">{t('footer.about')}</Link>
          <a className={a} href="mailto:help@yeral.app">{t('footer.help')}</a>
          <a className={a} href="mailto:hello@yeral.app">{t('footer.contacts')}</a>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-5 text-[13px] text-ink-3 md:px-6">
          <span>{t('footer.copyright', { year })} · {t('common.city')}</span>
          <span className="text-ink-3">{t('demo.bar')}</span>
        </div>
      </div>
    </footer>
  )
}

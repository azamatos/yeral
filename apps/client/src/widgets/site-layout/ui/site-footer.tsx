import { today } from '@yeral/domain/time'
import { Logo } from '@yeral/ui/brand'
import type { ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { site } from '@/shared/config'
import { wrap } from '@/shared/ui'

/**
 * The footer (Home, Account-Profile): the logo and the line under it, then columns of links, then the copyright. The
 * columns (five across, as the board's, wrapping on narrower screens) hold only pages that exist: «For business» now; «For clients» (Search, Categories, My bookings) and «Ýeral»
 * (about, help, contact) with their pages, the privacy policy and terms with P4 slice 7, «Language» with a market's
 * second language. «Pricing» stays out: Ýeral is free for businesses.
 */
export function SiteFooter() {
  const t = useTranslations()
  const brand = t('common.brand')
  const year = today().slice(0, 4)
  return (
    <footer className="border-t border-n-200 pt-14 pb-10">
      <div className={`${wrap} flex flex-col gap-10`}>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(max(min(170px,100%),calc((100%-128px)/5)),1fr))] gap-8">
          <div className="flex flex-col gap-4">
            <Logo alt={brand} height={26} className="self-start" />
            <span className="max-w-55 text-dense text-n-600">{t('site.tagline')}</span>
          </div>
          <FooterColumn title={t('footer.forBusiness')}>
            <FooterLink href={site.urls.business}>{t('footer.business', { brand })}</FooterLink>
            <FooterLink href={`${site.urls.business}/login`}>{t('footer.businessLogIn')}</FooterLink>
          </FooterColumn>
        </div>
        <div className="flex flex-wrap justify-between gap-4 border-t border-n-200 pt-5">
          <span className="text-dense text-n-600">{t('footer.copyright', { year, brand })}</span>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <nav aria-label={title} className="flex flex-col gap-2.5">
      <span className="text-label text-n-500 uppercase">{title}</span>
      {children}
    </nav>
  )
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="self-start rounded-xs text-small text-n-600 hover:text-n-900 focus-visible:shadow-focus focus-visible:outline-none"
    >
      {children}
    </a>
  )
}

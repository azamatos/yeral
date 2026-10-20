import { Link } from '@tanstack/react-router'
import { AuthCard, type AuthCardProps } from '@yeral/ui/auth-card'
import { Logo } from '@yeral/ui/brand'
import { ArrowRight } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { site } from '@/shared/config'

/** The client site's host as people type it («yeral.app»), from the site config. */
const clientHost = new URL(site.urls.client).host

/**
 * The sign-in page's frame (B-Login): AuthCard with the header lockup («Ýeral» + the «Business» tag, one link home)
 * and the footer link to the client site. Every step of the sign-in, and the pages that stand in for later slices.
 */
export function AuthPage(props: Omit<AuthCardProps, 'header' | 'footer'>) {
  const t = useTranslations()
  const brand = t('common.brand')
  return (
    <AuthCard
      {...props}
      header={
        <Link to="/" className="flex flex-none items-center gap-2.5 rounded-s focus-visible:shadow-focus focus-visible:outline-none">
          <Logo alt={brand} height={30} className="max-sm:h-6.5! max-sm:w-auto" />
          <span className="inline-flex h-5.5 items-center rounded-pill border border-a-line bg-a-50 px-2 text-micro font-semibold text-a-600">
            {t('app.tag')}
          </span>
        </Link>
      }
      footer={
        <a
          href={site.urls.client}
          className="inline-flex min-h-8 flex-wrap items-center justify-center gap-2 rounded-s px-1.5 hover:text-n-900 focus-visible:shadow-focus focus-visible:outline-none"
        >
          {t('app.clientSite', { brand })}
          <ArrowRight aria-hidden className="size-4" />
          <b className="font-semibold text-a-600">{clientHost}</b>
        </a>
      }
    />
  )
}

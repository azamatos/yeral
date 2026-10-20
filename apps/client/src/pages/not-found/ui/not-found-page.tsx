import { Link } from '@tanstack/react-router'
import { Button } from '@yeral/ui/button'
import { useLocale, useTranslations } from 'use-intl'
import { SiteLayout } from '@/widgets/site-layout'

/**
 * An address the site doesn't know (States tile 09, book C-49), served with HTTP 404: «404», «Page not found», one
 * primary back home, under the marketing header and footer. The board's second button, Search, joins with the
 * search page (P4 slice 5); a removed business's page lands here too once business pages exist (slice 3).
 */
export function NotFoundPage() {
  const t = useTranslations()
  const locale = useLocale()
  return (
    <SiteLayout>
      {/* no route's head() speaks for an unknown address: React puts these in the document's head */}
      <title>{`${t('notFound.title')} · ${t('common.brand')}`}</title>
      <meta name="robots" content="noindex" />
      <div className="flex flex-col items-center gap-2 px-6 pt-12 pb-14 text-center">
        <div aria-hidden className="text-display tracking-[-0.04em] text-n-500">
          404
        </div>
        <h1 className="m-0 text-h3">{t('notFound.title')}</h1>
        <p className="m-0 max-w-90 text-body text-n-600">{t('notFound.lead')}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <Button asChild variant="primary">
            <Link to="/$lang" params={{ lang: locale }}>
              {t('notFound.home')}
            </Link>
          </Button>
        </div>
      </div>
    </SiteLayout>
  )
}

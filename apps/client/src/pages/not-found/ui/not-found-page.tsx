import { Link } from '@tanstack/react-router'
import { Button } from '@yeral/ui/button'
import { Hourglass } from 'lucide-react'
import { useLocale, useTranslations } from 'use-intl'
import { SiteLayout } from '@/widgets/site-layout'

/** What a business page's loader puts in its 404 when the business is still in review (book C-10). */
export const NOT_OPEN = { notOpen: true } as const

/** Whether a 404's data says the page exists but hasn't opened yet. */
export const isNotOpen = (data: unknown): boolean => typeof data === 'object' && data !== null && 'notOpen' in data

/**
 * An address the site doesn't know (States tile 09, book C-49), served with HTTP 404: «404», «Page not found», one
 * primary back home, under the marketing header and footer. The board's second button, Search, joins with the
 * search page (P4 slice 5). `notOpen`: the link of a business Ýeral still checks (States 11, C-10): friendly words, no
 * «404» and nothing about the business, still a 404 that nothing indexes or keeps.
 */
export function NotFoundPage({ notOpen = false }: { notOpen?: boolean }) {
  const t = useTranslations()
  const locale = useLocale()
  const title = notOpen ? t('business.notOpen.title') : t('notFound.title')
  return (
    <SiteLayout>
      {/* no route's head() speaks for an unknown address: React puts these in the document's head */}
      <title>{`${title} · ${t('common.brand')}`}</title>
      <meta name="robots" content="noindex" />
      <div className="flex flex-col items-center gap-2 px-6 pt-12 pb-14 text-center">
        {notOpen ? (
          <div aria-hidden className="mb-3 flex size-14 items-center justify-center rounded-pill bg-a-50 text-a-500">
            <Hourglass className="size-[26px]" strokeWidth={1.75} />
          </div>
        ) : (
          <div aria-hidden className="text-display tracking-[-0.04em] text-n-500">
            404
          </div>
        )}
        <h1 className="m-0 text-h3">{title}</h1>
        <p className={`m-0 text-body text-pretty text-n-600 ${notOpen ? 'max-w-95' : 'max-w-90'}`}>
          {notOpen ? t('business.notOpen.lead', { brand: t('common.brand') }) : t('notFound.lead')}
        </p>
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

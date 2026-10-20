import { Button } from '@yeral/ui/button'
import { EmptyState } from '@yeral/ui/empty-state'
import { TriangleAlert } from 'lucide-react'
import { useTranslations } from 'use-intl'

/**
 * A page that failed to load or render (every route's `errorComponent`). Not drawn as a page: the inline block of
 * States tile 07 (icon, what happened, one way on), without the site's chrome, since the failure may be in it.
 */
export function ErrorPage({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations('failed')
  return (
    <main className="flex min-h-dvh items-center justify-center bg-n-0 px-4 py-16">
      <EmptyState
        bordered={false}
        role="alert"
        icon={<TriangleAlert />}
        title={<h1>{t('title')}</h1>}
        description={t('lead')}
        action={
          <Button variant="secondary" onClick={onRetry}>
            {t('action')}
          </Button>
        }
      />
    </main>
  )
}

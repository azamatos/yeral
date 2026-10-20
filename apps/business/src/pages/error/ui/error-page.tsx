import { Button } from '@yeral/ui/button'
import { EmptyState } from '@yeral/ui/empty-state'
import { TriangleAlert } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { useDocumentTitle } from '@/shared/lib'

/** A screen that failed to load or render (every route's `errorComponent`). Not drawn: the empty-state pattern. */
export function ErrorPage({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations()
  useDocumentTitle(t('failed.title'), t('app.name', { brand: t('common.brand') }))
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-16">
      <EmptyState
        bordered={false}
        icon={<TriangleAlert />}
        title={<h1>{t('failed.title')}</h1>}
        description={t('failed.lead')}
        action={
          <Button variant="secondary" onClick={onRetry}>
            {t('failed.action')}
          </Button>
        }
      />
    </main>
  )
}

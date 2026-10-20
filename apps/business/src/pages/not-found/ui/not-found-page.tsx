import { Link } from '@tanstack/react-router'
import { Button } from '@yeral/ui/button'
import { EmptyState } from '@yeral/ui/empty-state'
import { SearchX } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { usePageTitle } from '@/shared/lib'

/** An address the app doesn't know (every route's `notFoundComponent`). Not drawn: the empty-state pattern. */
export function NotFoundPage() {
  const t = useTranslations()
  usePageTitle(t('notFound.title'))
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-16">
      <EmptyState
        bordered={false}
        icon={<SearchX />}
        title={<h1>{t('notFound.title')}</h1>}
        description={t('notFound.lead')}
        action={
          <Button asChild variant="secondary">
            <Link to="/">{t('notFound.action')}</Link>
          </Button>
        }
      />
    </main>
  )
}

import { Button } from '@yeral/ui/button'
import { Spinner } from '@yeral/ui/spinner'
import { useTranslations } from 'use-intl'
import { AuthPage } from '@/shared/ui'

/** While the page asks who is signed in, or where they go next. Not drawn: the opening step's centred card. */
export function WaitStep() {
  const t = useTranslations('login')
  return (
    <AuthPage align="center" title={t('loading')} aria-busy>
      <Spinner className="size-6 text-a-500" />
    </AuthPage>
  )
}

/** Those questions failed (no connection, a server error). Not drawn: the empty-state pattern in the card. */
export function FailedStep({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations('failed')
  return (
    <AuthPage focusKey="failed" align="center" title={t('title')} lead={t('lead')}>
      <Button variant="secondary" onClick={onRetry}>
        {t('action')}
      </Button>
    </AuthPage>
  )
}

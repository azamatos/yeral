import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { CircleAlert } from 'lucide-react'
import { useTranslations } from 'use-intl'

/** Free times that didn't come (a lost connection, a service gone meanwhile): what happened and Try again. */
export function LoadFailed({ onRetry, className }: { onRetry: () => void; className?: string }) {
  const t = useTranslations()
  return (
    <Callout
      tone="danger"
      icon={<CircleAlert />}
      className={className}
      action={
        <Button size="s" variant="secondary" onClick={onRetry}>
          {t('failed.action')}
        </Button>
      }
    >
      {t('booking.loadFailed')}
    </Callout>
  )
}

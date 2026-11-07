import type { RemovedReview } from '@yeral/contract/reviews'
import { IconButton } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { Trash2, X } from 'lucide-react'
import { useTranslations } from 'use-intl'

/**
 * «Ýeral removed a review you reported» (B-Reviews; book Q-262: only the business hears the result): a neutral callout
 * with the trash icon, who the review was by, and Close. What the review said stays out of it.
 */
export function RemovedNotice({ removed, onClose }: { removed: RemovedReview; onClose: () => void }) {
  const t = useTranslations('reviews')
  const brand = useTranslations('common')('brand')
  return (
    <Callout
      tone="neutral"
      icon={<Trash2 aria-hidden />}
      live
      className="max-w-[680px]"
      action={
        <IconButton variant="plain" size="s" label={t('removed.close')} onClick={onClose}>
          <X aria-hidden />
        </IconButton>
      }
    >
      <b>{t('removed.title', { brand })}</b> {t('removed.text', { name: removed.author })}
    </Callout>
  )
}

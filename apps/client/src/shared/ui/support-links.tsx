import { cn } from '@yeral/ui/cn'
import { textLink } from '@yeral/ui/text-link'
import { useTranslations } from 'use-intl'
import { support } from '@/shared/config'

/** Where a sentence says "contact Ýeral": the support line's number and its Telegram, as links. */
export function SupportLinks({ className }: { className?: string }) {
  const t = useTranslations('support')
  return (
    <span className={cn('flex flex-wrap gap-x-4 gap-y-1 text-small', className)}>
      <a className={cn(textLink, 'tabular-nums')} href={support.phoneHref}>
        {support.phone}
      </a>
      <a className={textLink} href={support.telegramHref} target="_blank" rel="noreferrer">
        {t('telegramName', { name: support.telegram })}
      </a>
    </span>
  )
}

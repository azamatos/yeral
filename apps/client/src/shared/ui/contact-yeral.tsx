import { supportLinks } from '@yeral/features/contact-yeral'
import { cn } from '@yeral/ui/cn'
import { LinkMenu } from '@yeral/ui/link-menu'
import { textLink } from '@yeral/ui/text-link'
import type { Ref } from 'react'
import { useTranslations } from 'use-intl'

/**
 * "Contact Ýeral" as a text link: Call the support line or Write on Telegram, a menu or, on phones, a small sheet (the
 * business app's ContactMenu, B-Shell).
 */
export function ContactYeralLink({ ref, className }: { ref?: Ref<HTMLButtonElement>; className?: string }) {
  const t = useTranslations()
  const title = t('support.contact', { brand: t('common.brand') })
  return (
    <LinkMenu
      title={title}
      links={supportLinks({ call: t('support.call'), write: t('support.write') })}
      trigger={
        <button ref={ref} type="button" className={cn(textLink, 'hit inline-flex min-h-8 items-center self-start text-small', className)}>
          {title}
        </button>
      }
    />
  )
}

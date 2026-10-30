import { supportLinks } from '@yeral/features/contact-yeral'
import { cn } from '@yeral/ui/cn'
import { LinkMenu } from '@yeral/ui/link-menu'
import { textLink } from '@yeral/ui/text-link'
import type { Ref } from 'react'
import { useTranslations } from 'use-intl'
import { site } from '@/shared/config'

/**
 * "Contact Ýeral" as a text link: the ways to reach Ýeral that the deployment sets (`site.support`, book F-174): Call,
 * Write on Telegram, Write an e-mail; a menu or, on phones, a small sheet (the business app's ContactMenu, B-Shell).
 * Nothing when no way is set.
 */
export function ContactYeralLink({ ref, className }: { ref?: Ref<HTMLButtonElement>; className?: string }) {
  const t = useTranslations()
  const title = t('support.contact', { brand: t('common.brand') })
  const links = supportLinks(site.support, { call: t('support.call'), write: t('support.write'), email: t('support.email') })
  if (!links.length) return null
  return (
    <LinkMenu
      title={title}
      links={links}
      trigger={
        <button ref={ref} type="button" className={cn(textLink, 'hit inline-flex min-h-8 items-center self-start text-small', className)}>
          {title}
        </button>
      }
    />
  )
}

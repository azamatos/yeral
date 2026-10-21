import { supportLinks } from '@yeral/features/contact-yeral'
import { cn } from '@yeral/ui/cn'
import { LinkMenu } from '@yeral/ui/link-menu'
import { textLink } from '@yeral/ui/text-link'
import type { ReactElement, Ref } from 'react'
import { useTranslations } from 'use-intl'

/** Contact Ýeral's name and links (B-Shell ContactMenu); the account menu's submenu takes them as they are. */
export function useContactYeral() {
  const t = useTranslations()
  return {
    title: t('support.contact', { brand: t('common.brand') }),
    links: supportLinks({ call: t('support.call'), write: t('support.write') }),
  }
}

/**
 * Contact Ýeral from any trigger (B-Shell: the account menu, the owner's box, the Hidden by Ýeral banner, closing a
 * workspace; B-Mobile: More): Call the support line or Write on Telegram, a menu or, on phones, a small sheet.
 */
export function ContactYeral({ trigger }: { trigger: ReactElement }) {
  const { title, links } = useContactYeral()
  return <LinkMenu trigger={trigger} title={title} links={links} />
}

/** "Contact Ýeral" as a text link that opens it (B-Shell's owner box), its touch area grown to 44. */
export function ContactYeralLink({ ref, className }: { ref?: Ref<HTMLButtonElement>; className?: string }) {
  const { title } = useContactYeral()
  return (
    <ContactYeral
      trigger={
        <button ref={ref} type="button" className={cn(textLink, 'hit inline-flex min-h-8 items-center self-start text-small', className)}>
          {title}
        </button>
      }
    />
  )
}

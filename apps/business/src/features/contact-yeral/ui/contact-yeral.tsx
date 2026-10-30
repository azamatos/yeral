import { supportLinks } from '@yeral/features/contact-yeral'
import type { Support } from '@yeral/lib/site'
import { cn } from '@yeral/ui/cn'
import { LinkMenu } from '@yeral/ui/link-menu'
import { textLink } from '@yeral/ui/text-link'
import type { ReactElement, Ref } from 'react'
import { useTranslations } from 'use-intl'
import { site } from '@/shared/config'

/**
 * Contact Ýeral's name and links (B-Shell ContactMenu); the account menu's submenu takes them as they are. The ways
 * are the deployment's (`site.support`); a story passes its own. No way set: no links, and nothing to show.
 */
export function useContactYeral(support: Support = site.support) {
  const t = useTranslations()
  return {
    title: t('support.contact', { brand: t('common.brand') }),
    links: supportLinks(support, { call: t('support.call'), write: t('support.write'), email: t('support.email') }),
  }
}

/**
 * Contact Ýeral from any trigger (B-Shell: the account menu, the owner's box, the Hidden by Ýeral banner, closing a
 * workspace; B-Mobile: More): Call the support line, Write on Telegram or Write an e-mail, a menu or, on phones, a
 * small sheet. Nothing when no way to reach Ýeral is set.
 */
export function ContactYeral({ trigger, support }: { trigger: ReactElement; support?: Support }) {
  const { title, links } = useContactYeral(support)
  if (!links.length) return null
  return <LinkMenu trigger={trigger} title={title} links={links} />
}

/** "Contact Ýeral" as a text link that opens it (B-Shell's owner box), its touch area grown to 44. */
export function ContactYeralLink({ ref, className, support }: { ref?: Ref<HTMLButtonElement>; className?: string; support?: Support }) {
  const { title } = useContactYeral(support)
  return (
    <ContactYeral
      support={support}
      trigger={
        <button ref={ref} type="button" className={cn(textLink, 'hit inline-flex min-h-8 items-center self-start text-small', className)}>
          {title}
        </button>
      }
    />
  )
}

import { CopyField } from '@yeral/ui/copy-field'
import { useTranslations } from 'use-intl'
import { pageLink } from '../config'
import { shareLinks } from '../lib'

/**
 * A business's page link with Copy and Share (B-Settings Link and QR, B-Onboarding's last step): read as
 * `yeral.app/b/glow-studio`, copied and shared whole. `label` names the field: «Your page link».
 */
export function PageLinkField({ slug, label }: { slug: string; label: string }) {
  const t = useTranslations('pageLink')
  const link = pageLink(slug)
  const share = shareLinks(link.url)
  return (
    <CopyField
      value={link.url}
      display={link.display}
      label={label}
      copy={{ copy: t('copy'), copied: t('copied') }}
      share={{
        label: t('share'),
        targets: [
          { id: 'whatsapp', label: t('whatsapp'), href: share.whatsapp },
          { id: 'telegram', label: t('telegram'), href: share.telegram },
        ],
      }}
    />
  )
}

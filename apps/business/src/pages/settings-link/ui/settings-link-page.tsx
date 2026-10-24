import { Link } from '@tanstack/react-router'
import type { Workspace } from '@yeral/contract/team'
import { MARKET_LOCALES } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { QrBlock } from '@yeral/ui/qr-block'
import { SettingsSection, SettingsSectionTitle } from '@yeral/ui/settings-layout'
import { CircleAlert, CircleCheck, Clock, EyeOff, Headset } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { ContactYeral, useContactYeral } from '@/features/contact-yeral'
import { pageLink } from '@/shared/config'
import { PageLinkField } from '@/shared/ui'
import { SettingsPage } from '@/widgets/settings-frame'
import { useWorkspace } from '@/widgets/workspace-shell'

/**
 * Settings → Link and QR (B-Settings `pane=link`, design §28.5): where the page stands (live, in review, sent back,
 * hidden by Ýeral), the page link with Copy and Share, and the QR code with its downloads. The link has no language in
 * it; a market with several languages says so. The «Booking button» for a business's own site comes later.
 */
export function SettingsLinkPage() {
  const t = useTranslations('settings.link')
  const { workspace } = useWorkspace()
  const linkTitle = useId()
  const qrTitle = useId()
  if (!workspace) return null
  const link = pageLink(workspace.slug)
  return (
    <SettingsPage section="link" lead={t('lead')}>
      <PageState status={workspace.status} reason={workspace.statusReason} slug={workspace.slug} />

      <SettingsSection aria-labelledby={linkTitle}>
        <SettingsSectionTitle id={linkTitle} caption={t('linkCaption')}>
          {t('linkTitle')}
        </SettingsSectionTitle>
        <PageLinkField slug={workspace.slug} label={t('linkTitle')} />
        {MARKET_LOCALES.length > 1 ? <p className="m-0 text-dense text-n-600">{t('noLanguage')}</p> : null}
      </SettingsSection>

      <SettingsSection aria-labelledby={qrTitle}>
        <SettingsSectionTitle id={qrTitle}>{t('qrTitle')}</SettingsSectionTitle>
        <QrBlock
          value={link.url}
          label={t('qrLabel', { name: workspace.name })}
          fileName={`${workspace.slug}-qr`}
          title={workspace.name}
          link={link.display}
          description={t('qrNote')}
          caption={t('qrCaption')}
          copy={{
            downloadPng: t('downloadPng'),
            downloadSvg: t('downloadSvg'),
            downloaded: (format) => t('downloaded', { format }),
          }}
        />
      </SettingsSection>
    </SettingsPage>
  )
}

/**
 * Where the page stands (B-Settings `.lsb`): Live; In review (only the team sees it); Not approved, with the Ýeral
 * team's reason and «Fix and send again» in the business profile; Hidden by Ýeral, with the reason and Contact Ýeral.
 * The shared demo workspace is never public and says nothing here (its banner says it).
 */
function PageState({ status, reason, slug }: { status: Workspace['status']; reason: string | null; slug: string }) {
  const t = useTranslations()
  const s = useTranslations('settings.link.state')
  const contact = useContactYeral()
  let note: ReactNode = null
  if (status === 'live')
    note = (
      <Callout tone="success" icon={<CircleCheck />} title={s('live')} role="status">
        <span className="text-n-900">{s('liveText')}</span>
      </Callout>
    )
  else if (status === 'in_review')
    note = (
      <Callout tone="warning" icon={<Clock />} title={s('inReview')} role="status">
        <span className="text-n-900">{s('inReviewText')}</span>
      </Callout>
    )
  else if (status === 'not_approved')
    note = (
      <Callout
        tone="danger"
        icon={<CircleAlert />}
        title={s('notApproved')}
        role="status"
        actions={
          <Button asChild size="s">
            <Link to="/w/$slug/settings/profile" params={{ slug }}>
              {s('fix')}
            </Link>
          </Button>
        }
      >
        {reason ? <span className="text-n-900">{reason}</span> : null}
      </Callout>
    )
  else if (status === 'hidden')
    note = (
      <Callout
        tone="neutral"
        icon={<EyeOff />}
        className="border-n-200"
        title={s('hidden', { brand: t('common.brand') })}
        role="status"
        actions={
          <ContactYeral
            trigger={
              <Button size="s">
                <Headset aria-hidden />
                {contact.title}
              </Button>
            }
          />
        }
      >
        <span className="flex flex-col gap-1 text-n-900">
          {reason ? <span>{reason}</span> : null}
          <span>{s('hiddenText')}</span>
        </span>
      </Callout>
    )
  return note ? <div className="pb-6">{note}</div> : null
}

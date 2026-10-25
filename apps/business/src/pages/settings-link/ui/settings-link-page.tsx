import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import type { Workspace } from '@yeral/contract/team'
import { MARKET_LOCALES } from '@yeral/i18n'
import { keys } from '@yeral/sdk'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { SettingsSection, SettingsSectionTitle } from '@yeral/ui/settings-layout'
import { toast } from '@yeral/ui/toast'
import { CircleAlert, CircleCheck, Clock, EyeOff, Headset, Pencil } from 'lucide-react'
import { useId, useRef, useState, type ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { ContactYeral, useContactYeral } from '@/features/contact-yeral'
import { PageAddressField, savable, takenOnSave, usePageAddressCheck } from '@/features/page-address'
import { useSdk } from '@/shared/api'
import { pageLink } from '@/shared/config'
import { useErrorText } from '@/shared/i18n'
import { PageLinkField, PageQrCard } from '@/shared/ui'
import { SettingsPage } from '@/widgets/settings-frame'
import { useWorkspace } from '@/widgets/workspace-shell'

/**
 * Settings → Link and QR (B-Settings `pane=link`, design §28.5): where the page stands (live, in review, sent back,
 * hidden by Ýeral), the page link with Copy and Share and «Change link» (chapter 9, 25.10.2026), and the QR code with
 * its downloads. The link has no language in it; a market with several languages says so. The «Booking button» for a
 * business's own site comes later.
 */
export function SettingsLinkPage() {
  const t = useTranslations('settings.link')
  const tl = useTranslations('pageLink')
  const { workspace } = useWorkspace()
  const linkTitle = useId()
  const qrTitle = useId()
  if (!workspace) return null
  return (
    <SettingsPage section="link" lead={t('lead')}>
      <PageState status={workspace.status} reason={workspace.statusReason} slug={workspace.slug} />

      <SettingsSection aria-labelledby={linkTitle}>
        <SettingsSectionTitle id={linkTitle} caption={tl('caption')}>
          {tl('title')}
        </SettingsSectionTitle>
        <PageLinkField slug={workspace.slug} label={tl('title')} />
        {MARKET_LOCALES.length > 1 ? <p className="m-0 text-dense text-n-600">{tl('noLanguage')}</p> : null}
        {/* the shared demo workspace keeps its address (`/w/demo`): one visitor doesn't move it for the rest */}
        {workspace.status !== 'demo' && <ChangeLink key={workspace.slug} slug={workspace.slug} />}
      </SettingsSection>

      <SettingsSection aria-labelledby={qrTitle}>
        <SettingsSectionTitle id={qrTitle}>{tl('qrTitle')}</SettingsSectionTitle>
        <PageQrCard slug={workspace.slug} name={workspace.name} />
      </SettingsSection>
    </SettingsPage>
  )
}

/**
 * «Change link» (the owner's request, 25.10.2026; not drawn: the «Add group» box's pattern): the address checked as
 * it's typed, the note that old links and printed QR codes keep working, Save; the workspace's pages then move to the
 * new address. Escape or Cancel leaves it (not while it saves).
 */
function ChangeLink({ slug }: { slug: string }) {
  const t = useTranslations('settings.link')
  const ta = useTranslations('pageAddress')
  const sdk = useSdk()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const errorText = useErrorText()
  const move = useMutation(sdk.settings.setPageAddress(slug))
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(slug)
  const state = usePageAddressCheck(open ? value : '', { business: slug, own: slug })
  const button = useRef<HTMLButtonElement>(null)
  const titleId = useId()
  const close = () => {
    if (move.isPending) return
    setOpen(false)
    // the box goes with the focus in it
    requestAnimationFrame(() => button.current?.focus())
  }
  const save = () => {
    if (value === slug || !savable(state) || move.isPending) return
    move.mutate(
      { slug: value },
      {
        onSuccess: (moved) => {
          toast(t('changed', { url: pageLink(moved.slug).display }))
          void navigate({ to: '/w/$slug/settings/link', params: { slug: moved.slug }, replace: true })
        },
        onError: (error) => {
          // taken meanwhile: said so, and its check asks again (it offers a free one like it)
          if (takenOnSave(error)) {
            toast(ta('taken'))
            void queryClient.invalidateQueries({ queryKey: keys.pageAddressAll() })
          } else toast(errorText(error))
        },
      },
    )
  }
  if (!open)
    return (
      <div>
        <Button
          ref={button}
          variant="secondary"
          size="s"
          onClick={() => {
            setValue(slug)
            setOpen(true)
          }}
        >
          <Pencil aria-hidden />
          {t('change')}
        </Button>
      </div>
    )
  return (
    <div
      role="group"
      aria-labelledby={titleId}
      className="flex flex-col gap-3 rounded-card border border-n-200 bg-n-50 p-4"
      onKeyDown={(e) => {
        if (e.key === 'Escape') close()
        if (e.key === 'Enter' && e.target instanceof HTMLInputElement) {
          e.preventDefault()
          save()
        }
      }}
    >
      <h3 id={titleId} className="m-0 text-button font-semibold text-n-900">
        {t('change')}
      </h3>
      <PageAddressField label={t('changeTitle')} value={value} onChange={setValue} state={state} autoFocus />
      <p className="m-0 text-dense text-n-600">{t('changeNote')}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="s" disabled={move.isPending} onClick={close}>
          {t('cancel')}
        </Button>
        <Button size="s" disabled={value === slug || !savable(state)} loading={move.isPending} loadingLabel={t('saving')} onClick={save}>
          {t('save')}
        </Button>
      </div>
    </div>
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

import { useMutation, useQuery } from '@tanstack/react-query'
import type { TeamMember } from '@yeral/contract/team'
import { maskPhone } from '@yeral/domain/phone'
import { INVITE_DAYS, inviteState } from '@yeral/domain/team'
import { diffDays, today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { CopyField } from '@yeral/ui/copy-field'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@yeral/ui/menu'
import { Modal, ModalContent, ModalDescription, ModalHeader } from '@yeral/ui/modal'
import { Spinner } from '@yeral/ui/spinner'
import { textLink } from '@yeral/ui/text-link'
import { toast } from '@yeral/ui/toast'
import { Ellipsis, Info } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { SettingsPage } from '@/widgets/settings-frame'
import { useWorkspace } from '@/widgets/workspace-shell'

/**
 * Settings → Team (B-Team `tab=team`, design §8 «Topar», §28.4 Team, book B-43–B-50): everyone in groups,
 * Specialists (clients see and pick them), Management (they take no bookings), the open and past Invites, and those no
 * longer on the team. A row says the person's access level, how many services they do, their hours (the business's,
 * or their own shift) and where they stand: Active, Invited (working without the app until they accept), Removed;
 * «Doesn't use the app». The owner gets an invite's link, resends or cancels it, and reactivates someone removed; an
 * administrator sees the team and can't change it here.
 */
export function SettingsTeamPage() {
  const { workspace, me } = useWorkspace()
  if (!workspace) return null
  return <TeamSettings key={workspace.slug} slug={workspace.slug} owner={workspace.level === 'owner'} myPhone={me?.phone ?? null} />
}

/** Clients pick from specialists and anyone doing a service; the rest manage (B-Team `kindOf`). */
const takesBookings = (m: TeamMember, services: number) => m.level === 'specialist' || services > 0

/** The six columns from 1280, where the pane is wide enough for them (B-Team `.tr`); under it each row stacks. */
const COLUMNS = 'xl:grid-cols-[minmax(0,1.5fr)_104px_88px_minmax(0,1fr)_minmax(0,1.2fr)_40px]'

function TeamSettings({ slug, owner, myPhone }: { slug: string; owner: boolean; myPhone: string | null }) {
  const t = useTranslations('settings.team')
  const sdk = useSdk()
  const team = useQuery(sdk.team.list(slug))
  const menu = useQuery(sdk.settings.menu(slug))
  // the invite link a send just returned, to copy (the api keeps only its hash, so it can't be read back later)
  const [link, setLink] = useState<{ name: string; url: string } | null>(null)

  // the groups and counts come from the menu too: both, or the page waits
  if (!team.data && team.isError) throw team.error
  if (!menu.data && menu.isError) throw menu.error
  if (!team.data || !menu.data)
    return (
      <SettingsPage section="team" lead={t('lead')}>
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      </SettingsPage>
    )

  const counts = new Map<string, number>()
  for (const s of menu.data.groups.flatMap((g) => g.services)) for (const id of s.staffIds) counts.set(id, (counts.get(id) ?? 0) + 1)
  const servicesOf = (id: string) => counts.get(id) ?? 0
  const people = team.data.items
  const live = people.filter((m) => m.status === 'active')
  const sections = [
    { id: 'specialists', rows: live.filter((m) => takesBookings(m, servicesOf(m.id))) },
    { id: 'management', rows: live.filter((m) => !takesBookings(m, servicesOf(m.id))) },
    { id: 'invites', rows: people.filter((m) => m.status === 'invited') },
    { id: 'former', rows: people.filter((m) => m.status === 'removed') },
  ] as const

  return (
    <SettingsPage section="team" lead={t('lead')}>
      {!owner && (
        <Callout tone="neutral" icon={<Info />}>
          {t('adminNote')}
        </Callout>
      )}
      <div className="flex flex-col">
        <div aria-hidden className={`hidden min-h-10 items-center gap-x-3 border-y border-n-200 px-2 xl:grid ${COLUMNS}`}>
          {(['name', 'level', 'services', 'hours', 'status'] as const).map((k) => (
            <span key={k} className="text-label text-n-500 uppercase">
              {t(`columns.${k}`)}
            </span>
          ))}
        </div>
        {sections.map(
          (s) =>
            s.rows.length > 0 && (
              <div key={s.id} role="group" aria-label={t(`sections.${s.id}.title`)}>
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-b border-n-200 px-2 pt-5 pb-2">
                  <span className="text-label text-n-500 uppercase">{t(`sections.${s.id}.title`)}</span>
                  <span className="text-dense text-n-600">{t(`sections.${s.id}.sub`, { days: INVITE_DAYS })}</span>
                </div>
                {s.rows.map((m) => (
                  <MemberRow
                    key={m.id}
                    slug={slug}
                    member={m}
                    owner={owner}
                    me={!!myPhone && m.phone === myPhone}
                    services={servicesOf(m.id)}
                    pro={s.id === 'specialists' || (s.id === 'invites' && m.level === 'specialist')}
                    onLink={(url) => setLink({ name: m.fullName ?? m.name, url })}
                  />
                ))}
              </div>
            ),
        )}
      </div>
      <Modal open={link !== null} onOpenChange={(open) => !open && setLink(null)}>
        {link && (
          <ModalContent>
            <ModalHeader title={t('linkTitle', { name: link.name })} closeLabel={t('close')}>
              <ModalDescription>{t('linkLead', { days: INVITE_DAYS })}</ModalDescription>
            </ModalHeader>
            <CopyField value={link.url} label={t('linkLabel')} copy={{ copy: t('copy'), copied: t('copied') }} />
          </ModalContent>
        )}
      </Modal>
    </SettingsPage>
  )
}

/** «Business hours», or «Own shift» with «12:00–19:00», «varies by day» or «no working days». */
function useHours(slug: string, member: TeamMember, pro: boolean) {
  const t = useTranslations('settings.team.hours')
  const fmt = useFmt()
  const sdk = useSdk()
  const schedule = useQuery({ ...sdk.team.schedule(slug, member.id), enabled: pro && member.status === 'active' })
  if (!pro) return { hours: '—', sub: '' }
  if (member.status === 'invited') return { hours: t('business'), sub: '' }
  if (!schedule.data) return { hours: '', sub: '' }
  const shift = schedule.data.shift
  if (!shift) return { hours: t('business'), sub: '' }
  const ranges = [...new Set(shift.flatMap((d) => (d ? [fmt.timeRange(d.open, d.close)] : [])))]
  return { hours: t('own'), sub: ranges.length === 0 ? t('noDays') : ranges.length === 1 ? ranges[0]! : t('varies') }
}

function MemberRow({
  slug,
  member: m,
  owner,
  me,
  services,
  pro,
  onLink,
}: {
  slug: string
  member: TeamMember
  owner: boolean
  me: boolean
  services: number
  pro: boolean
  onLink: (url: string) => void
}) {
  const t = useTranslations('settings.team')
  const levels = useTranslations('levels')
  const fmt = useFmt()
  const sdk = useSdk()
  const errorText = useErrorText()
  const resend = useMutation(sdk.team.resendInvite(slug))
  const cancel = useMutation(sdk.team.cancelInvite(slug))
  const reactivate = useMutation(sdk.team.reactivate(slug))
  const { hours, sub: hoursSub } = useHours(slug, m, pro)
  const busy = resend.isPending || cancel.isPending || reactivate.isPending

  const name = m.fullName ?? m.name
  const former = m.status === 'removed'
  const inviteRow = m.status === 'invited'
  const [now] = useState(() => Date.now())
  const state =
    m.invite && inviteState({ status: m.invite.state === 'expired' ? 'pending' : m.invite.state, expiresAt: m.invite.expiresAt }, now)
  const pending = state === 'pending'
  // a specialist without the app who was sent an invite works as before until they accept
  const waiting = m.status === 'active' && pending && !m.joined
  // calendar days, as the board counts them: sent today, «7 days left»
  const daysLeft = m.invite ? Math.max(1, diffDays(today(m.invite.expiresAt), today(now))) : 0

  let status: { tone: 'on' | 'invited' | 'off'; label: string; sub?: string }
  if (former) status = { tone: 'off', label: t('status.removed') }
  else if (inviteRow)
    status =
      state === 'expired'
        ? { tone: 'off', label: t('status.expired'), sub: t('status.endedOn', { date: fmt.dayMonth(today(m.invite!.expiresAt)) }) }
        : state === 'declined' || state === 'cancelled'
          ? { tone: 'off', label: t(`status.${state}`) }
          : { tone: 'invited', label: t('status.invited'), sub: pending ? t('status.daysLeft', { n: daysLeft }) : undefined }
  else if (waiting) status = { tone: 'invited', label: t('status.invited'), sub: t('status.untilAccept') }
  else status = { tone: 'on', label: t('status.active') }

  const act = (action: () => Promise<void>) => async () => {
    if (busy) return
    try {
      await action()
    } catch (error) {
      toast(errorText(error))
    }
  }
  // «Copy invite link»: the link exists only in a send's answer (the api keeps its hash), so it sends the invite again
  // and shows that link to copy (a fresh click, so a refused clipboard still leaves it selected in the field)
  const copyLink = act(async () => onLink((await resend.mutateAsync(m.id)).link))
  const resendIt = act(async () => {
    const sent = await resend.mutateAsync(m.id)
    toast(t('resent', { name: m.name }), { action: { label: t('copyLink'), onClick: () => onLink(sent.link) } })
  })
  const cancelIt = act(async () => {
    await cancel.mutateAsync(m.id)
    toast(t('cancelled', { name: m.name }))
  })
  const reactivateIt = act(async () => {
    const back = await reactivate.mutateAsync(m.id)
    // someone removed before they joined comes back invited, and needs a new invite
    toast(back.status === 'active' ? t('reactivated', { name: m.name }) : t('reactivatedInvite', { name: m.name }))
  })

  const link = !owner
    ? null
    : former
      ? { text: t('reactivate'), aria: t('reactivateAria', { name }), go: reactivateIt }
      : inviteRow || waiting
        ? pending
          ? { text: t('copyLink'), aria: t('copyLinkAria', { name }), go: copyLink }
          : { text: t('resend'), aria: t('resendAria', { name }), go: resendIt }
        : null
  const caption =
    owner && former
      ? t('reactivateCaption', { name: m.name })
      : inviteRow && pending && m.phone
        ? t('signInWith', { phone: maskPhone(m.phone) })
        : null
  const servicesText = pro && !former ? t('services', { n: services }) : '—'
  // an open invite names no phone (its caption does, masked); a past one shows it masked
  const sub = me
    ? t('you')
    : inviteRow
      ? [m.specialization, !pending && m.phone ? maskPhone(m.phone) : ''].filter(Boolean).join(' · ')
      : (m.specialization ?? (m.phone ? fmt.phone(m.phone) : ''))
  const meta = [
    levels(m.level),
    pro && !former ? servicesText : '',
    pro && !former && hours ? [hours, hoursSub].filter(Boolean).join(' ') : '',
  ]
    .filter(Boolean)
    .join(' · ')
  const tone = { on: 'text-st-completed-ink', invited: 'text-st-pending-ink', off: 'text-st-cancelled-ink' }[status.tone]
  const dot = { on: 'bg-st-completed-dot', invited: 'bg-st-pending-dot', off: 'bg-st-cancelled-dot' }[status.tone]

  return (
    <div
      className={`grid min-h-16 grid-cols-[minmax(0,1fr)_40px] items-center gap-x-3 gap-y-1 border-b border-n-200 px-1 py-2.5 text-small xl:px-2 xl:py-2 ${COLUMNS} ${former ? 'text-n-600' : ''}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={m.name} src={m.photo?.url} size={32} letters={1} tone={former || inviteRow ? 'neutral' : 'tint'} decorative />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-body leading-5 font-semibold">{name}</span>
          {sub && <span className="text-dense text-n-600">{sub}</span>}
          <span className="text-dense text-n-600 xl:hidden">{meta}</span>
        </span>
      </div>
      <div className="hidden xl:block">
        <span className="inline-flex min-h-6.5 items-center rounded-pill border border-n-200 bg-group px-2.5 text-dense font-semibold text-n-900">
          {levels(m.level)}
        </span>
      </div>
      <span className="hidden xl:block">{servicesText}</span>
      <span className="hidden flex-col xl:flex">
        <span>{pro && !former ? hours || '…' : '—'}</span>
        {pro && !former && hoursSub && <span className="text-dense text-n-600 tabular-nums">{hoursSub}</span>}
      </span>
      <div className="col-start-1 row-start-2 flex min-w-0 flex-row flex-wrap items-center gap-x-2.5 gap-y-0.5 pl-11 xl:col-start-auto xl:row-start-auto xl:flex-col xl:items-start xl:pl-0">
        <span className={`inline-flex items-center gap-2 text-small font-semibold ${tone}`}>
          <span aria-hidden className={`size-1.5 rounded-pill ${dot}`} />
          {status.label}
        </span>
        {status.sub && <span className="text-dense text-n-600 tabular-nums">{status.sub}</span>}
        {m.level === 'specialist' && !m.hasApp && !former && !inviteRow && (
          <span className="inline-flex items-center rounded-pill bg-n-100 px-1.75 text-[11px] leading-4 font-semibold whitespace-nowrap text-n-600">
            {t('noApp')}
          </span>
        )}
        {link && (
          <button
            type="button"
            aria-label={link.aria}
            aria-busy={busy || undefined}
            onClick={() => void link.go()}
            className={`${textLink} -ml-2 min-h-8 px-2 py-1 text-left text-dense`}
          >
            {link.text}
          </button>
        )}
      </div>
      <div className="col-start-2 row-start-1 flex justify-end xl:col-start-auto xl:row-start-auto">
        {owner && inviteRow && pending && (
          <Menu>
            <MenuTrigger asChild>
              <Button variant="ghost" size="s" iconOnly aria-label={t('actions', { name })}>
                <Ellipsis />
              </Button>
            </MenuTrigger>
            <MenuContent>
              <MenuItem onSelect={() => void copyLink()}>{t('copyLink')}</MenuItem>
              <MenuItem onSelect={() => void resendIt()}>{t('resend')}</MenuItem>
              <MenuItem onSelect={() => void cancelIt()} className="text-danger-ink">
                {t('cancelInvite')}
              </MenuItem>
            </MenuContent>
          </Menu>
        )}
      </div>
      {caption && <span className="col-span-full pl-11 text-dense text-n-600">{caption}</span>}
    </div>
  )
}

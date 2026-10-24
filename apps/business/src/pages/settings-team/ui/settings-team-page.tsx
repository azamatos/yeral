import { useMutation, useQuery } from '@tanstack/react-query'
import type { TeamMember } from '@yeral/contract/team'
import { maskPhone } from '@yeral/domain/phone'
import { today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Callout } from '@yeral/ui/callout'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@yeral/ui/menu'
import { Button } from '@yeral/ui/button'
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

const DAY_MS = 86_400_000

/**
 * Settings → Team (B-Team `tab=team`, design §8 «Topar», §28.4 Team, book B-43–B-50): everyone in groups,
 * Specialists (clients see and pick them), Management (they take no bookings), the open and past Invites, and those no
 * longer on the team. A row says the person's access level, how many services they do, their hours (the business's,
 * or their own shift) and where they stand: Active, Invited (working without the app until they accept), Removed;
 * «Doesn't use the app». The owner copies or resends an invite's link, cancels it, and reactivates someone removed; an
 * administrator sees the team and can't change it here.
 */
export function SettingsTeamPage() {
  const { workspace, me } = useWorkspace()
  if (!workspace) return null
  return <TeamSettings key={workspace.slug} slug={workspace.slug} owner={workspace.level === 'owner'} myPhone={me?.phone ?? null} />
}

/** Clients pick from specialists and anyone doing a service; the rest manage (B-Team `kindOf`). */
const takesBookings = (m: TeamMember, services: number) => m.level === 'specialist' || services > 0

function TeamSettings({ slug, owner, myPhone }: { slug: string; owner: boolean; myPhone: string | null }) {
  const t = useTranslations('settings.team')
  const sdk = useSdk()
  const team = useQuery(sdk.team.list(slug))
  const menu = useQuery(sdk.settings.menu(slug))

  if (!team.data && team.isError) throw team.error
  if (!team.data)
    return (
      <SettingsPage section="team" lead={t('lead')}>
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      </SettingsPage>
    )

  const servicesOf = (id: string) => menu.data?.groups.flatMap((g) => g.services).filter((s) => s.staffIds.includes(id)).length ?? 0
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
        <div
          aria-hidden
          className="grid min-h-10 grid-cols-[minmax(180px,1.5fr)_112px_92px_minmax(112px,1fr)_minmax(150px,1.2fr)_40px] items-center gap-x-3 border-y border-n-200 px-2 max-lg:hidden"
        >
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
                  <span className="text-dense text-n-600">{t(`sections.${s.id}.sub`)}</span>
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
                  />
                ))}
              </div>
            ),
        )}
      </div>
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
  const shift = schedule.data?.shift
  if (!schedule.data) return { hours: '', sub: '' }
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
}: {
  slug: string
  member: TeamMember
  owner: boolean
  me: boolean
  services: number
  pro: boolean
}) {
  const t = useTranslations('settings.team')
  const levels = useTranslations('levels')
  const fmt = useFmt()
  const sdk = useSdk()
  const errorText = useErrorText()
  const [now] = useState(() => Date.now())
  const resend = useMutation(sdk.team.resendInvite(slug))
  const cancel = useMutation(sdk.team.cancelInvite(slug))
  const reactivate = useMutation(sdk.team.reactivate(slug))
  const { hours, sub: hoursSub } = useHours(slug, m, pro)

  const name = m.fullName ?? m.name
  const former = m.status === 'removed'
  const invite = m.invite
  const inviteRow = m.status === 'invited'
  const pending = invite?.state === 'pending' && invite.expiresAt > now
  // a specialist without the app who was sent an invite works as before until they accept
  const waiting = m.status === 'active' && pending && !m.joined
  const daysLeft = invite ? Math.max(1, Math.ceil((invite.expiresAt - now) / DAY_MS)) : 0
  const inviteState = !invite ? null : pending ? 'pending' : invite.state === 'pending' ? 'expired' : invite.state

  let status: { tone: 'on' | 'invited' | 'off'; label: string; sub?: string }
  if (former) status = { tone: 'off', label: t('status.removed') }
  else if (inviteRow)
    status =
      inviteState === 'pending'
        ? { tone: 'invited', label: t('status.invited'), sub: t('status.daysLeft', { n: daysLeft }) }
        : inviteState === 'expired'
          ? { tone: 'off', label: t('status.expired'), sub: t('status.endedOn', { date: fmt.dayMonth(today(invite!.expiresAt)) }) }
          : { tone: 'off', label: t(inviteState === 'declined' ? 'status.declined' : 'status.cancelled') }
  else if (waiting) status = { tone: 'invited', label: t('status.invited'), sub: t('status.untilAccept') }
  else status = { tone: 'on', label: t('status.active') }

  // «Copy invite link»: the link exists only in a send's answer (the api keeps its hash), so it resends and copies it
  const copyLink = async () => {
    try {
      const sent = await resend.mutateAsync(m.id)
      await navigator.clipboard.writeText(sent.link)
      toast(t('linkCopied'))
    } catch (error) {
      toast(errorText(error))
    }
  }
  const run = (action: () => Promise<unknown>, done: string) => async () => {
    try {
      await action()
      toast(done)
    } catch (error) {
      toast(errorText(error))
    }
  }
  const resendIt = run(() => resend.mutateAsync(m.id), t('resent', { name: m.name }))
  const cancelIt = run(() => cancel.mutateAsync(m.id), t('cancelled', { name: m.name }))
  const reactivateIt = run(() => reactivate.mutateAsync(m.id), t('reactivated', { name: m.name }))
  const busy = resend.isPending || cancel.isPending || reactivate.isPending

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
    owner && former ? t('reactivateCaption', { name: m.name }) : pending && m.phone ? t('signInWith', { phone: maskPhone(m.phone) }) : null
  const services_ = pro && !former ? t('services', { n: services }) : '—'
  const sub = me ? t('you') : (m.specialization ?? (m.phone ? fmt.phone(m.phone) : ''))
  const meta = [
    levels(m.level),
    pro && !former ? services_ : '',
    pro && !former && hours ? [hours, hoursSub].filter(Boolean).join(' ') : '',
  ]
    .filter(Boolean)
    .join(' · ')
  const tone = { on: 'text-st-completed-ink', invited: 'text-st-pending-ink', off: 'text-st-cancelled-ink' }[status.tone]
  const dot = { on: 'bg-st-completed-dot', invited: 'bg-st-pending-dot', off: 'bg-st-cancelled-dot' }[status.tone]

  return (
    <div
      className={`grid min-h-16 grid-cols-[minmax(180px,1.5fr)_112px_92px_minmax(112px,1fr)_minmax(150px,1.2fr)_40px] items-center gap-x-3 gap-y-1 border-b border-n-200 px-2 py-2 text-small max-lg:grid-cols-[minmax(0,1fr)_40px] max-lg:px-1 max-lg:py-2.5 ${former ? 'text-n-600' : ''}`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden
          className={`inline-flex size-8 flex-none items-center justify-center rounded-pill text-small font-bold ${former || inviteRow ? 'bg-n-100 text-n-600' : 'bg-a-50 text-a-600'}`}
        >
          {m.name.charAt(0)}
        </span>
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-body leading-5 font-semibold">{name}</span>
          {sub && <span className="text-dense text-n-600">{sub}</span>}
          <span className="text-dense text-n-600 lg:hidden">{meta}</span>
        </span>
      </div>
      <div className="max-lg:hidden">
        <span className="inline-flex min-h-6.5 items-center rounded-pill border border-n-200 bg-group px-2.5 text-dense font-semibold text-n-900">
          {levels(m.level)}
        </span>
      </div>
      <span className="max-lg:hidden">{services_}</span>
      <span className="flex flex-col max-lg:hidden">
        <span>{pro && !former ? hours || '…' : '—'}</span>
        {pro && !former && hoursSub && <span className="text-dense text-n-600 tabular-nums">{hoursSub}</span>}
      </span>
      <div className="flex min-w-0 flex-col items-start gap-0.5 max-lg:col-start-1 max-lg:row-start-2 max-lg:flex-row max-lg:flex-wrap max-lg:items-center max-lg:gap-x-2.5 max-lg:pl-11">
        <span className={`inline-flex items-center gap-2 text-small font-semibold ${tone}`}>
          <span aria-hidden className={`size-1.5 rounded-pill ${dot}`} />
          {status.label}
        </span>
        {status.sub && <span className="text-dense text-n-600 tabular-nums">{status.sub}</span>}
        {m.level === 'specialist' && !m.hasApp && !former && (
          <span className="inline-flex items-center rounded-pill bg-n-100 px-1.75 text-[11px] leading-4 font-semibold whitespace-nowrap text-n-600">
            {t('noApp')}
          </span>
        )}
        {link && (
          <button
            type="button"
            disabled={busy}
            aria-label={link.aria}
            onClick={() => void link.go()}
            className={`${textLink} -ml-2 min-h-8 px-2 py-1 text-left text-dense`}
          >
            {link.text}
          </button>
        )}
      </div>
      <div className="flex justify-end max-lg:col-start-2 max-lg:row-start-1">
        {owner && inviteRow && pending && (
          <Menu>
            <MenuTrigger asChild>
              <Button variant="ghost" size="s" iconOnly disabled={busy} aria-label={t('actions', { name })}>
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

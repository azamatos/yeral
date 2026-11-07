import { useMutation, useQuery } from '@tanstack/react-query'
import type { TeamMember } from '@yeral/contract/team'
import { INVITE_DAYS } from '@yeral/domain/team'
import { today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Avatar } from '@yeral/ui/avatar'
import { Button, IconButton } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { cn } from '@yeral/ui/cn'
import { CopyField } from '@yeral/ui/copy-field'
import { InfoTip } from '@yeral/ui/info-tip'
import { Input } from '@yeral/ui/input'
import { useMediaQuery } from '@yeral/ui/media-query'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '@yeral/ui/menu'
import { Modal, ModalContent, ModalDescription, ModalHeader } from '@yeral/ui/modal'
import { Pill } from '@yeral/ui/pill'
import { Select } from '@yeral/ui/select'
import { Spinner } from '@yeral/ui/spinner'
import { Table, TableCell, TableColumnHeader, TableHeader, TableRow } from '@yeral/ui/table'
import { toast } from '@yeral/ui/toast'
import { Tooltip } from '@yeral/ui/tooltip'
import { Check, Ellipsis, Info, RotateCcw, Send, UserMinus, UserPlus } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { useAffectedCount } from '@/entities/booking'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { SettingsPage } from '@/widgets/settings-frame'
import { useWorkspace } from '@/widgets/workspace-shell'
import { inviteAgainForm, inviteNow } from '../model/invite'
import { invitePending, leftAhead } from '../model/member'
import { AddMember } from './add-member'
import { MemberDrawer } from './member-drawer'
import { RemoveMember } from './remove-member'

/**
 * Settings → Team (design v0.7 · B7-Team B9, book B-43–B-50): one table of everyone — the owner, admins and specialists,
 * the open and past invites, and those no longer on the team — Name · Access level · Takes bookings · Services · Hours
 * · Status. No «Management» group: whoever has a service takes bookings, the owner and admins too. A row opens the
 * member page; a removed row has Reactivate; an open invite has its link, resend and cancel. Search and two filters
 * narrow the table. The owner adds someone («Add a team member»); an administrator sees the team and can't change it
 * here. Under 768 the people are list items.
 */
export function SettingsTeamPage() {
  const { workspace, me } = useWorkspace()
  if (!workspace) return null
  return (
    <TeamSettings
      key={workspace.slug}
      slug={workspace.slug}
      business={workspace.name}
      owner={workspace.level === 'owner'}
      myPhone={me?.phone ?? null}
    />
  )
}

/** Clients see and book anyone with at least one service (B7-Team «Takes bookings» ⓘ). */
const takesBookings = (services: number) => services > 0

const ALL = 'all'
const LEVEL_FILTERS = ['all', 'owner', 'admin', 'specialist'] as const
const TAKES_FILTERS = ['all', 'yes', 'no'] as const
type Filters = { q: string; level: (typeof LEVEL_FILTERS)[number]; takes: (typeof TAKES_FILTERS)[number] }

/** Name · Access level · Takes bookings · Services · Hours · Status (B7-Team `.tr.tm`). */
const COLUMNS = 'minmax(0,1fr) 92px 128px 72px 112px 208px'

/** The rows in the order the owner reads them: the people, then the invites, then those no longer on the team. */
const ORDER: Record<TeamMember['status'], number> = { active: 0, invited: 1, removed: 2 }

function TeamSettings({ slug, business, owner, myPhone }: { slug: string; business: string; owner: boolean; myPhone: string | null }) {
  const t = useTranslations('settings.team')
  const sdk = useSdk()
  const team = useQuery(sdk.team.list(slug))
  const menu = useQuery(sdk.settings.menu(slug))
  const wide = useMediaQuery('(min-width: 768px)')
  // the invite link a send just returned, to copy (the api keeps only its hash, so it can't be read back later)
  const [link, setLink] = useState<{ name: string; url: string } | null>(null)
  const count = useAffectedCount()
  const [adding, setAdding] = useState(false)
  // «Invite again» for someone who left: Add a team member with them filled in
  const [again, setAgain] = useState<TeamMember | null>(null)
  // «Choose» on «Someone left»: whose bookings the remove window settles
  const [settling, setSettling] = useState<TeamMember | null>(null)
  const againOpener = useRef<HTMLButtonElement | null>(null)
  // the staff drawer: whose, and the row's name to give the focus back to
  const [openId, setOpenId] = useState<string | null>(null)
  const opener = useRef<HTMLElement | null>(null)
  const addButton = useRef<HTMLButtonElement>(null)
  const [filters, setFilters] = useState<Filters>({ q: '', level: ALL, takes: ALL })

  // the services per person come from the menu too: both, or the page waits
  if (!team.data && team.isError) throw team.error
  if (!menu.data && menu.isError) throw menu.error
  if (!team.data || !menu.data)
    return (
      <SettingsPage section="team" wide lead={t('lead')}>
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      </SettingsPage>
    )

  const counts = new Map<string, number>()
  for (const s of menu.data.groups.flatMap((g) => g.services)) for (const id of s.staffIds) counts.set(id, (counts.get(id) ?? 0) + 1)
  const servicesOf = (id: string) => counts.get(id) ?? 0
  const people = team.data.items
  const q = filters.q.trim().toLowerCase()
  const digits = q.replace(/\D/g, '')
  const rows = people
    .filter((m) => {
      if (filters.level !== ALL && m.level !== filters.level) return false
      if (filters.takes !== ALL && takesBookings(servicesOf(m.id)) !== (filters.takes === 'yes')) return false
      if (!q) return true
      const names = [m.name, m.fullName ?? ''].join(' ').toLowerCase()
      return names.includes(q) || (digits.length >= 2 && !!m.phone && m.phone.replace(/\D/g, '').includes(digits))
    })
    .sort((a, b) => ORDER[a.status] - ORDER[b.status])
  const filtered = !!q || filters.level !== ALL || filters.takes !== ALL

  const rowProps = (m: TeamMember) => ({
    slug,
    member: m,
    owner,
    me: !!myPhone && m.phone === myPhone,
    services: servicesOf(m.id),
    onLink: (url: string) => setLink({ name: m.fullName ?? m.name, url }),
    onInviteAgain: (el: HTMLButtonElement) => {
      // the focus comes back to the row's button when the window closes
      againOpener.current = el
      setAgain(m)
      setAdding(true)
    },
    onOpen:
      m.status === 'removed'
        ? undefined
        : (el: HTMLElement) => {
            opener.current = el
            setOpenId(m.id)
          },
  })

  return (
    <SettingsPage
      section="team"
      wide
      lead={t('lead')}
      action={
        owner && (
          <Button
            ref={addButton}
            variant="primary"
            size="s"
            aria-haspopup="dialog"
            onClick={() => {
              setAgain(null)
              setAdding(true)
            }}
          >
            <UserPlus aria-hidden strokeWidth={1.75} />
            {t('add.open')}
          </Button>
        )
      }
    >
      {!owner && (
        <Callout tone="neutral" icon={<Info />}>
          {t('adminNote')}
        </Callout>
      )}
      {/* «Someone left» (B-Team, owner only): their bookings and requests ahead wait for a new specialist */}
      {owner &&
        people
          .filter((m) => leftAhead(m).total > 0)
          .map((m) => (
            <Callout
              key={m.id}
              tone="warning"
              icon={<UserMinus />}
              live
              action={
                <Button variant="secondary" size="s" aria-haspopup="dialog" onClick={() => setSettling(m)}>
                  {t('leftChoose')}
                </Button>
              }
            >
              {t('leftBanner', { name: m.name, what: count(leftAhead(m), 'and'), n: leftAhead(m).total })}
            </Callout>
          ))}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          size="m"
          aria-label={t('filters.search')}
          placeholder={t('filters.search')}
          className="w-full sm:w-80"
          value={filters.q}
          onChange={(e) => setFilters({ ...filters, q: e.target.value })}
        />
        <Select
          size="m"
          aria-label={t('filters.level')}
          className="w-auto max-sm:hidden"
          listWidth="content"
          value={filters.level}
          onValueChange={(v) => setFilters({ ...filters, level: v as Filters['level'] })}
          options={LEVEL_FILTERS.map((value) => ({ value, label: t(`filters.levels.${value}`) }))}
        />
        <Select
          size="m"
          aria-label={t('filters.takes')}
          className="w-auto max-sm:hidden"
          listWidth="content"
          value={filters.takes}
          onValueChange={(v) => setFilters({ ...filters, takes: v as Filters['takes'] })}
          options={TAKES_FILTERS.map((value) => ({ value, label: t(`filters.takesOptions.${value}`) }))}
        />
        {filtered && (
          <Button variant="tertiary" size="s" onClick={() => setFilters({ q: '', level: ALL, takes: ALL })}>
            {t('filters.clear')}
          </Button>
        )}
        <span className="flex-1" />
        <span className="text-dense whitespace-nowrap text-n-500">{t('count', { n: rows.length })}</span>
      </div>
      {rows.length === 0 ? (
        <p className="m-0 py-8 text-center text-small text-n-600">{t('empty')}</p>
      ) : wide ? (
        <Table aria-label={t('table')} columns={COLUMNS} className="rounded-m border border-n-200 bg-n-0">
          <TableHeader className="px-2">
            <TableColumnHeader>{t('columns.name')}</TableColumnHeader>
            <TableColumnHeader>{t('columns.level')}</TableColumnHeader>
            <TableColumnHeader className="justify-center gap-1.5">
              {t('columns.takesBookings')}
              <InfoTip label={t('aboutTakesBookings')}>{t('takesBookingsAbout')}</InfoTip>
            </TableColumnHeader>
            <TableColumnHeader numeric>{t('columns.services')}</TableColumnHeader>
            <TableColumnHeader>{t('columns.hours')}</TableColumnHeader>
            <TableColumnHeader>{t('columns.status')}</TableColumnHeader>
          </TableHeader>
          {rows.map((m) => (
            <MemberRow key={m.id} {...rowProps(m)} />
          ))}
        </Table>
      ) : (
        <ul aria-label={t('table')} className="m-0 flex list-none flex-col border-t border-n-200 p-0">
          {rows.map((m) => (
            <MemberItem key={m.id} {...rowProps(m)} />
          ))}
        </ul>
      )}
      {owner && settling && (
        <RemoveMember
          slug={slug}
          member={settling}
          business={business}
          mode="left"
          open
          onOpenChange={(open) => !open && setSettling(null)}
          onRemoved={() => {
            // the banner and its Choose go with the choice: the focus goes to «Add a team member»
            setSettling(null)
            setTimeout(() => addButton.current?.focus())
          }}
        />
      )}
      {owner && (
        <AddMember
          slug={slug}
          people={people}
          initial={again ? inviteAgainForm(again) : undefined}
          menu={menu.data}
          open={adding}
          onOpenChange={setAdding}
          opener={again ? againOpener : addButton}
          onLink={(name, url) => setLink({ name, url })}
        />
      )}
      <MemberDrawer
        slug={slug}
        business={business}
        member={people.find((m) => m.id === openId && m.status !== 'removed') ?? null}
        people={people}
        menu={menu.data}
        owner={owner}
        myPhone={myPhone}
        returnFocus={opener}
        onClose={() => setOpenId(null)}
        onRemoved={() => {
          // their row stays, dimmed, without the button that opened the drawer
          opener.current = addButton.current
          setOpenId(null)
        }}
        onLink={(name, url) => setLink({ name, url })}
      />
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

/** «Business hours», the own shift's one time range («12:00–19:00»), or «Own shift» when it varies by day. */
function useHours(slug: string, member: TeamMember, shown: boolean) {
  const t = useTranslations('settings.team.hours')
  const fmt = useFmt()
  const sdk = useSdk()
  const schedule = useQuery({ ...sdk.team.schedule(slug, member.id), enabled: shown && member.status === 'active' })
  if (!shown) return '—'
  if (member.status === 'invited') return t('business')
  if (!schedule.data) return ''
  const shift = schedule.data.shift
  if (!shift) return t('business')
  const ranges = [...new Set(shift.flatMap((d) => (d ? [fmt.timeRange(d.open, d.close)] : [])))]
  return ranges.length === 1 ? ranges[0]! : t('own')
}

interface RowProps {
  slug: string
  member: TeamMember
  owner: boolean
  me: boolean
  services: number
  onLink: (url: string) => void
  /** Opens their member page (not for someone no longer on the team). */
  onOpen?: (from: HTMLElement) => void
  /** Someone who left: «Invite again» opens Add a team member with them filled in (the button gets the focus back). */
  onInviteAgain: (from: HTMLButtonElement) => void
}

/** What a row says and does, for the table and the phone's list alike. */
function useMemberRow({ slug, member: m, owner, services, onLink, onInviteAgain }: RowProps) {
  const t = useTranslations('settings.team')
  const fmt = useFmt()
  const sdk = useSdk()
  const errorText = useErrorText()
  const resend = useMutation(sdk.team.resendInvite(slug))
  const cancel = useMutation(sdk.team.cancelInvite(slug))
  const reactivate = useMutation(sdk.team.reactivate(slug))
  const busy = resend.isPending || cancel.isPending || reactivate.isPending

  const name = m.fullName ?? m.name
  const former = m.status === 'removed'
  // «Left» by themself, or «Removed» by the owner (B-Team: someone removed before it was recorded reads «Removed»)
  const left = former && m.ended?.by === 'self'
  const inviteRow = m.status === 'invited'
  const [now] = useState(() => Date.now())
  const state = m.invite && inviteNow(m.invite, now)
  const pending = invitePending(m, now)
  // a specialist without the app who was sent an invite works as before until they accept
  const waiting = m.status === 'active' && pending && !m.joined
  const shift = m.level === 'specialist' || takesBookings(services)
  const hours = useHours(slug, m, shift && !former)

  // one StatusPill per row (B7-Team StaffStatus): Active · Doesn't use the app · Invited · until 21 Oct · Removed; an
  // invite that ended and someone who left use the same slate pill
  const endedOn = (at: number) => (today(at) === today(now) ? t('status.today') : fmt.shortDate(today(at)))
  let status: { tone: 'success' | 'neutral' | 'warning' | 'slate'; label: string }
  if (former) {
    const label = left ? t('status.left') : t('status.removed')
    status = { tone: 'slate', label: m.ended ? t('status.withDate', { label, date: endedOn(m.ended.at) }) : label }
  } else if (inviteRow)
    status =
      state === 'expired'
        ? { tone: 'slate', label: t('status.withDate', { label: t('status.expired'), date: fmt.shortDate(today(m.invite!.expiresAt)) }) }
        : state === 'declined' || state === 'cancelled'
          ? { tone: 'slate', label: t(`status.${state}`) }
          : { tone: 'warning', label: t('status.invitedUntil', { date: fmt.shortDate(today(m.invite!.expiresAt)) }) }
  else if (!m.hasApp) status = { tone: 'neutral', label: t('noApp') }
  else status = { tone: 'success', label: t('status.active') }

  const act = (action: () => Promise<void>) => async () => {
    if (busy) return
    try {
      await action()
    } catch (error) {
      toast.error(errorText(error))
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

  // the owner's action in the row: one icon button, or the «…» menu of an open invite (B8: «…» only with 2+ actions)
  let action: ReactNode = null
  if (owner) {
    const icon = (label: string, go: (el: HTMLButtonElement) => unknown, child: ReactNode) => (
      <IconButton variant="plain" size="s" label={label} aria-busy={busy || undefined} onClick={(e) => void go(e.currentTarget)}>
        {child}
      </IconButton>
    )
    if (left) {
      // not while their bookings wait for a choice: invited, they'd leave «Someone left» with the bookings unsettled
      if (leftAhead(m).total === 0) action = icon(t('inviteAgainAria', { name }), onInviteAgain, <UserPlus />)
    } else if (former) action = icon(t('reactivateAria', { name }), reactivateIt, <RotateCcw />)
    else if (inviteRow || waiting)
      action = pending ? (
        <Menu>
          <MenuTrigger asChild>
            <IconButton variant="plain" size="s" label={t('actions', { name })}>
              <Ellipsis />
            </IconButton>
          </MenuTrigger>
          <MenuContent>
            <MenuItem onSelect={() => void copyLink()}>{t('copyLink')}</MenuItem>
            <MenuItem onSelect={() => void resendIt()}>{t('resend')}</MenuItem>
            <MenuItem onSelect={() => void cancelIt()} className="text-danger-ink">
              {t('cancelInvite')}
            </MenuItem>
          </MenuContent>
        </Menu>
      ) : (
        icon(t('resendAria', { name }), resendIt, <Send />)
      )
  }

  return { name, former, inviteRow, takes: takesBookings(services) && !former, hours, status, action }
}

/** The status as one pill with a 6 px dot (B7-Team `.pill`). */
function StatusPill({ tone, label }: { tone: 'success' | 'neutral' | 'warning' | 'slate'; label: string }) {
  const dot = { success: 'bg-st-completed-dot', neutral: 'bg-n-500', warning: 'bg-st-pending-dot', slate: 'bg-st-cancelled-dot' }[tone]
  return (
    <Pill tone={tone} size="m" className="gap-1.5 pr-2.5 pl-2" icon={<span aria-hidden className={`size-1.5 rounded-pill ${dot}`} />}>
      {label}
    </Pill>
  )
}

/** The name as the row's button: one line, truncating, with the job title in a tooltip; the whole row opens the member. */
function NameButton({
  name,
  title,
  onOpen,
  className,
}: {
  name: string
  title: string | null
  onOpen?: (from: HTMLElement) => void
  className?: string
}) {
  const text = onOpen ? (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={(e) => onOpen(e.currentTarget)}
      className={cn(
        'block min-w-0 cursor-pointer truncate border-0 bg-transparent p-0 text-left after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:shadow-focus-inset',
        className,
      )}
    >
      {name}
    </button>
  ) : (
    <span className={cn('block min-w-0 truncate', className)}>{name}</span>
  )
  return title ? <Tooltip content={title}>{text}</Tooltip> : text
}

function MemberRow(props: RowProps) {
  const { member: m, owner, me, services, onOpen } = props
  const t = useTranslations('settings.team')
  const levels = useTranslations('levels')
  const { name, former, inviteRow, takes, hours, status, action } = useMemberRow(props)
  return (
    <TableRow className={cn('px-2', former && 'text-n-600 hover:bg-transparent')}>
      <TableCell className="relative flex-row items-center gap-2.5">
        <Avatar name={m.name} src={m.photo?.url} size={28} letters={1} tone={former || inviteRow ? 'neutral' : 'tint'} decorative />
        <NameButton
          name={name}
          title={m.specialization}
          onOpen={onOpen}
          className={cn('font-medium', former ? 'text-n-600' : 'text-n-900')}
        />
        {me && <span className="flex-none text-dense text-n-500">{t('you')}</span>}
      </TableCell>
      <TableCell>{levels(m.level)}</TableCell>
      <TableCell className="items-center justify-center">
        {takes ? (
          <>
            <Check aria-hidden strokeWidth={2} className="size-4.5 text-n-900" />
            <span className="sr-only">{t('takes.yes')}</span>
          </>
        ) : (
          <>
            <span aria-hidden className="text-[16px]/5 text-n-500">
              —
            </span>
            <span className="sr-only">{t('takes.no')}</span>
          </>
        )}
      </TableCell>
      <TableCell numeric className={cn('pr-6.5', !takes && 'text-n-500')}>
        {takes ? services : '—'}
      </TableCell>
      <TableCell className={cn('truncate', hours === '—' && 'text-n-500')}>{hours}</TableCell>
      <TableCell className="relative z-1 flex-row items-center gap-1">
        <StatusPill {...status} />
        {owner && action}
      </TableCell>
    </TableRow>
  )
}

/** Under 768 (B7-Team 390 `.li2`): avatar 36, the name with the level on the right, the job and services under it. */
function MemberItem(props: RowProps) {
  const { member: m, me, services, onOpen } = props
  const t = useTranslations('settings.team')
  const levels = useTranslations('levels')
  const { name, former, inviteRow, takes, status, action } = useMemberRow(props)
  const line = takes ? [m.specialization, t('services', { n: services })].filter(Boolean).join(' · ') : t('takes.no')
  return (
    <li className={cn('relative flex h-17 items-center gap-3 border-b border-n-200 px-4', former && 'text-n-600')}>
      <Avatar name={m.name} src={m.photo?.url} size={36} letters={1} tone={former || inviteRow ? 'neutral' : 'tint'} decorative />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-3">
          <NameButton
            name={name}
            title={null}
            onOpen={onOpen}
            className={cn('flex-1 text-[15px]/5 font-medium', former ? 'text-n-600' : 'text-n-900')}
          />
          {me && <span className="-ml-2 flex-none text-dense text-n-500">{t('you')}</span>}
          <span className="flex-none text-small font-medium text-n-900">{levels(m.level)}</span>
        </span>
        <span className="flex items-center gap-3">
          <span className="min-w-0 flex-1 truncate text-dense text-n-500">{line}</span>
          {(status.tone !== 'success' || action) && (
            <span className="relative z-1 flex flex-none items-center gap-1">
              {status.tone !== 'success' && <StatusPill {...status} />}
              {action}
            </span>
          )}
        </span>
      </span>
    </li>
  )
}

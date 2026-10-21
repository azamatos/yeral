import type { InviteCard } from '@yeral/contract/team'
import { localOf } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { Bell, Calendar, Clock, Settings, Star, UsersRound, type LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'use-intl'
import { AuthPage } from '@/shared/ui'
import { AccountLine } from './account-line'
import { BusinessMark } from './business-mark'

type Line = 'admin1' | 'admin2' | 'admin2Reviews' | 'admin3' | 'specialist1' | 'specialist2' | 'specialist3'
interface Can {
  icon: LucideIcon
  line: Line
}

/**
 * What each level may do, in three lines (the fixed permission table, design §28.1). The requests line says requests
 * only when the invite says they'll answer them there: the business's "who answers", instant confirmation and their
 * own switch decide it (book B-08, chapter 9 21.10.2026); the level says how far (the desk's, or their own).
 * `notAnswering` is that line when they won't: an Administrator still replies to reviews (book chapter 3, "Reply to
 * reviews"), a Specialist has nothing left there (they read the reviews about them).
 */
const CAN: Record<InviteCard['level'], (Can & { notAnswering?: Can | null })[]> = {
  admin: [
    { icon: Calendar, line: 'admin1' },
    { icon: Bell, line: 'admin2', notAnswering: { icon: Star, line: 'admin2Reviews' } },
    { icon: Settings, line: 'admin3' },
  ],
  specialist: [
    { icon: Calendar, line: 'specialist1' },
    { icon: Bell, line: 'specialist2', notAnswering: null },
    { icon: UsersRound, line: 'specialist3' },
  ],
}

/** The lines for this invite. */
function linesFor(invite: InviteCard): Can[] {
  return CAN[invite.level].flatMap(({ notAnswering, ...can }) =>
    invite.answersRequests || notAnswering === undefined ? [can] : notAnswering ? [notAnswering] : [],
  )
}

/**
 * An invite waiting for the signed-in phone (B-Login `step=invite`, book B-08): the workspace, who invited, the level
 * and what it may do, until when; Accept joins and opens the workspace, Decline asks once in place. The answers are
 * the entry step's, which outlives this card when the invites reload.
 */
export function InviteStep({
  invite,
  who,
  onOtherNumber,
  leaving,
  accepting,
  declining,
  onAccept,
  onDecline,
}: {
  invite: InviteCard
  who: string
  onOtherNumber: () => void
  leaving: boolean
  accepting: boolean
  declining: boolean
  onAccept: () => void
  onDecline: () => void
}) {
  const t = useTranslations()
  const fmt = useFmt()
  const [asking, setAsking] = useState(false)
  const confirmRef = useRef<HTMLParagraphElement>(null)
  const { business } = invite
  const level = t(`levels.${invite.level}`)
  const busy = accepting || declining

  // the question takes the focus when it opens (B-Login focusEl(confirmEl))
  useEffect(() => {
    if (asking) confirmRef.current?.focus()
  }, [asking])

  return (
    <AuthPage
      focusKey="invite"
      media={
        <div className="flex min-w-0 items-center gap-3.5">
          <BusinessMark name={business.name} logo={business.logo} />
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[17px] leading-6 font-semibold">{business.name}</span>
            <span className="text-dense text-n-600">
              {t('login.invite.where', { category: business.category, city: business.city.name })}
            </span>
          </span>
        </div>
      }
      eyebrow={t('login.invite.eyebrow')}
      title={t('login.invite.title', { business: business.name })}
      lead={
        <span className="flex items-center gap-2.5 text-n-900">
          {invite.invitedBy && <Avatar name={invite.invitedBy} size={32} aria-hidden />}
          <span>
            {invite.invitedBy
              ? t.rich('login.invite.by', { name: invite.invitedBy, level, b: (chunks) => <b>{chunks}</b> })
              : t.rich('login.invite.byNobody', { level, b: (chunks) => <b>{chunks}</b> })}
          </span>
        </span>
      }
    >
      <div className="flex flex-col gap-3">
        <span id="invite-can" className="text-label text-n-500 uppercase">
          {t('login.invite.as', { level: invite.level })}
        </span>
        <ul aria-labelledby="invite-can" className="m-0 flex list-none flex-col gap-3 p-0">
          {linesFor(invite).map(({ icon: Icon, line }) => (
            <li key={line} className="flex items-center gap-3 text-body">
              <span className="inline-flex size-9 flex-none items-center justify-center rounded-pill bg-group">
                <Icon aria-hidden className="size-4.5" />
              </span>
              {t(`login.invite.${line}`)}
            </li>
          ))}
        </ul>
      </div>
      <p className="m-0 flex items-center gap-2 text-small font-medium">
        <Clock aria-hidden className="size-4.5 flex-none text-n-600" />
        {t('login.invite.until', { date: fmt.dayMonth(localOf(invite.expiresAt).date) })}
      </p>
      {asking ? (
        <div role="group" aria-labelledby="invite-decline" className="flex flex-col gap-3 rounded-m border border-n-200 bg-n-50 p-4">
          <p id="invite-decline" ref={confirmRef} tabIndex={-1} className="m-0 text-body font-semibold focus:outline-none">
            {t('login.invite.declineTitle')}
          </p>
          <p className="m-0 text-dense text-n-600">
            {invite.invitedBy ? t('login.invite.declineLead', { name: invite.invitedBy }) : t('login.invite.declineLeadNobody')}
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" disabled={declining} onClick={() => setAsking(false)}>
              {t('login.invite.back')}
            </Button>
            <Button variant="danger" loading={declining} onClick={onDecline}>
              {t('login.invite.declineConfirm')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Button variant="primary" size="l" className="w-full" loading={accepting} onClick={onAccept}>
            {t('login.invite.accept')}
          </Button>
          <Button variant="secondary" size="l" className="w-full" disabled={busy} onClick={() => setAsking(true)}>
            {t('login.invite.decline')}
          </Button>
        </div>
      )}
      <AccountLine who={who} onOtherNumber={onOtherNumber} busy={leaving || busy} />
    </AuthPage>
  )
}

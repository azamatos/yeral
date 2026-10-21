import { Link } from '@tanstack/react-router'
import type { InviteCard } from '@yeral/contract/team'
import { INVITE_DAYS } from '@yeral/domain/team'
import { localOf } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { CalendarX2, Info, Store, UsersRound } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { AuthPage } from '@/shared/ui'
import { AccountLine } from './account-line'
import { DeclinedLine } from './declined-line'

const iconTile = 'flex size-12 flex-none items-center justify-center rounded-pill bg-group [&_svg]:size-5.5'

/**
 * "You don't have a workspace yet" (B-Login `step=empty`, book B-09): create a business, or ask for an invite. After
 * declining an invite it says so on top. "Try the business app" waits for the demo workspace (P2 step 6).
 */
export function NoWorkspaceStep({
  who,
  declined,
  onOtherNumber,
  leaving,
}: {
  who: string
  declined: string | null
  onOtherNumber: () => void
  leaving: boolean
}) {
  const t = useTranslations('login')
  return (
    <AuthPage
      focusKey="empty"
      media={
        <>
          {declined && <DeclinedLine business={declined} />}
          <span aria-hidden className={iconTile}>
            <Store />
          </span>
        </>
      }
      title={t('empty.title')}
      lead={t('empty.lead')}
    >
      <Button asChild variant="primary" size="l" className="w-full">
        <Link to="/setup/$step" params={{ step: 'business' }}>
          {t('empty.create')}
        </Link>
      </Button>
      <Callout tone="neutral" icon={<UsersRound />}>
        {t('empty.note')}
      </Callout>
      <AccountLine who={who} onOtherNumber={onOtherNumber} busy={leaving} />
    </AuthPage>
  )
}

/** The latest invite ran out and there's no workspace (B-Login `step=inviteExpired`, book B-08 edge case). */
export function InviteExpiredStep({
  invite,
  who,
  onOtherNumber,
  leaving,
}: {
  invite: InviteCard
  who: string
  onOtherNumber: () => void
  leaving: boolean
}) {
  const t = useTranslations('login')
  const fmt = useFmt()
  return (
    <AuthPage
      focusKey="expired"
      media={
        <span aria-hidden className={iconTile}>
          <CalendarX2 />
        </span>
      }
      title={t('expired.title')}
      lead={t('expired.lead', {
        days: INVITE_DAYS,
        business: invite.business.name,
        sent: fmt.dayMonth(localOf(invite.sentAt).date),
        ended: fmt.dayMonth(localOf(invite.expiresAt).date),
      })}
    >
      <Callout tone="neutral" icon={<Info />}>
        {t('expired.note')}
      </Callout>
      <AccountLine ghost who={who} onOtherNumber={onOtherNumber} busy={leaving} />
    </AuthPage>
  )
}

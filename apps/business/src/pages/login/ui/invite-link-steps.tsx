import { Link } from '@tanstack/react-router'
import type { InviteCard } from '@yeral/contract/team'
import { INVITE_DAYS } from '@yeral/domain/team'
import { localOf } from '@yeral/domain/time'
import type { useSignIn } from '@yeral/features/auth-by-phone'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { CalendarX2, Info, MailCheck, MailX, Unlink, type LucideIcon } from 'lucide-react'
import { useId } from 'react'
import { useTranslations } from 'use-intl'
import { AccountLine, CodeLead, SignInForm } from '@/features/sign-in'
import { AuthPage, iconTile } from '@/shared/ui'
import { InviteBy, InviteMedia } from './invite-step'

/**
 * The invite behind a link, signed out (`/invite/$token`, book B-08, ADR 0025): the workspace, who invited and the
 * level, and the sign-in in the same card. The link opens the invite and never signs anyone in: the number has to
 * match, so the person logs in with the one the invite went to, and the card becomes the invite step.
 */
export function InviteSignInStep({ invite, signIn }: { invite: InviteCard; signIn: ReturnType<typeof useSignIn> }) {
  const t = useTranslations('login')
  const titleId = useId()
  const onCode = signIn.state.step === 'code'
  return (
    <AuthPage
      titleId={titleId}
      media={<InviteMedia business={invite.business} />}
      eyebrow={t('invite.eyebrow')}
      title={onCode ? t('codeTitle') : t('invite.title', { business: invite.business.name })}
      lead={onCode ? <CodeLead signIn={signIn} /> : <InviteBy invite={invite} />}
    >
      {!onCode && <p className="m-0 text-small text-n-600">{t('invite.link.signIn')}</p>}
      <SignInForm signIn={signIn} labelledBy={titleId} />
    </AuthPage>
  )
}

/** Signed in with a number the invite wasn't sent to: it says so, and «Log in with another number» is the way on. */
export function InviteOtherNumberStep({
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
  return (
    <AuthPage
      focusKey="other-number"
      media={<InviteMedia business={invite.business} />}
      eyebrow={t('invite.eyebrow')}
      title={t('invite.link.otherNumberTitle')}
      lead={t('invite.link.otherNumberLead', { business: invite.business.name })}
    >
      <AccountLine who={who} onOtherNumber={onOtherNumber} busy={leaving} />
    </AuthPage>
  )
}

export type InviteGone = 'notFound' | 'expired' | 'answered' | 'cancelled'

const GONE: Record<InviteGone, LucideIcon> = { notFound: Unlink, expired: CalendarX2, answered: MailCheck, cancelled: MailX }
const WORDS = {
  notFound: ['invite.link.notFoundTitle', 'invite.link.notFoundLead'],
  answered: ['invite.link.answeredTitle', 'invite.link.answeredLead'],
  cancelled: ['invite.link.cancelledTitle', 'invite.link.cancelledLead'],
} as const

/**
 * A link that leads nowhere: unknown, run out (the sign-in page's expired card, with the invite's dates), already
 * answered, or taken back. One way on: the sign-in page, which knows where a signed-in person belongs.
 */
export function InviteGoneStep({
  signedIn,
  ...gone
}: { signedIn: boolean } & (
  { reason: 'expired'; invite: InviteCard } | { reason: Exclude<InviteGone, 'expired'>; invite: InviteCard | null }
)) {
  const t = useTranslations('login')
  const fmt = useFmt()
  const Icon = GONE[gone.reason]
  const business = gone.invite?.business.name ?? ''
  const expired = gone.reason === 'expired'
  return (
    <AuthPage
      focusKey={`gone-${gone.reason}`}
      media={
        <span aria-hidden className={iconTile}>
          <Icon />
        </span>
      }
      title={gone.reason === 'expired' ? t('expired.title') : t(WORDS[gone.reason][0])}
      lead={
        gone.reason === 'expired'
          ? t('expired.lead', {
              days: INVITE_DAYS,
              business,
              sent: fmt.dayMonth(localOf(gone.invite.sentAt).date),
              ended: fmt.dayMonth(localOf(gone.invite.expiresAt).date),
            })
          : t(WORDS[gone.reason][1], { business })
      }
    >
      {expired && (
        <Callout tone="neutral" icon={<Info />}>
          {t('invite.link.expiredNote')}
        </Callout>
      )}
      <Button asChild variant="primary" size="l" className="w-full">
        <Link to="/login">{t(signedIn ? 'invite.link.continue' : 'invite.link.logIn')}</Link>
      </Button>
    </AuthPage>
  )
}

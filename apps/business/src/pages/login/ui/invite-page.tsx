import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type { Me } from '@yeral/contract/account'
import type { InviteCard } from '@yeral/contract/team'
import { formatPhone, maskPhone } from '@yeral/domain/phone'
import { useCodeOnScreen, useSignIn } from '@yeral/features/auth-by-phone'
import { isApiError } from '@yeral/sdk'
import { toast } from '@yeral/ui/toast'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { ContactYeralLink } from '@/features/contact-yeral'
import { IdentityStep } from '@/features/sign-in'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { usePageTitle } from '@/shared/lib'
import { InviteGoneStep, InviteOtherNumberStep, InviteSignInStep, type InviteGone } from './invite-link-steps'
import { InviteStep } from './invite-step'
import { NameStep } from './name-step'
import { FailedStep, WaitStep } from './wait-steps'

/**
 * `/invite/$token`, the link the api puts in an invite (book B-08, ADR 0025): it opens the invite and never signs
 * anyone in. Signed out: the invite with the sign-in in the card; the name for someone new. Signed in: the invite card
 * when the invite is among this number's, «sent to another number» otherwise. A link that ran out, was answered,
 * taken back or never existed says so. Accept opens the workspace; Decline goes on to the sign-in page, which knows
 * where the person belongs.
 */
export function InvitePage({ token }: { token: string }) {
  const t = useTranslations('login')
  const sdk = useSdk()
  const errorText = useErrorText()
  const me = useQuery(sdk.me.get())
  // a bad link is a 404: no retries before the card says so
  const invite = useQuery({ ...sdk.team.invite(token), retry: false })
  useCodeOnScreen()
  const logout = useMutation(sdk.auth.logout())
  const [identity, setIdentity] = useState<{ name: string | null; ticket: string } | null>(null)
  const business = invite.data?.business.name
  usePageTitle(business ? t('invite.link.tabTitle', { business }) : t('invite.eyebrow'))

  const failed = (error: unknown) => void toast(errorText(error))
  const signIn = useSignIn({
    onVerified: (answer) => {
      if ('isThisYou' in answer) setIdentity(answer.isThisYou)
    },
    onFailed: failed,
  })

  if (identity)
    return (
      <IdentityStep
        {...identity}
        onAnswered={() => {
          setIdentity(null)
          signIn.reset()
        }}
        onBack={() => {
          setIdentity(null)
          signIn.changeNumber()
        }}
        onExpired={(error) => {
          setIdentity(null)
          signIn.refuseCode(error)
        }}
        onFailed={failed}
        contact={ContactYeralLink}
      />
    )
  if (invite.isPending || me.isPending) return <WaitStep />
  if (invite.isError) {
    if (isApiError(invite.error, 'not_found')) return <InviteGoneStep reason="notFound" invite={null} signedIn={!!me.data} />
    return <FailedStep onRetry={() => void invite.refetch()} />
  }
  // a failed refetch keeps the person on screen; only not knowing who is signed in at all is a failure
  if (me.isError && me.data === undefined) return <FailedStep onRetry={() => void me.refetch()} />
  const gone = goneFor(invite.data)
  if (gone === 'expired') return <InviteGoneStep reason="expired" invite={invite.data} signedIn={!!me.data} />
  if (gone) return <InviteGoneStep reason={gone} invite={invite.data} signedIn={!!me.data} />
  if (!me.data) return <InviteSignInStep invite={invite.data} signIn={signIn} />
  if (!me.data.firstName) return <NameStep phone={me.data.phone} onFailed={failed} />
  return (
    <SignedInInvite
      me={me.data}
      invite={invite.data}
      onGone={() => void invite.refetch()}
      // «Log in with another number»: signed out, the invite with the phone step again
      onOtherNumber={() => logout.mutate(undefined, { onSuccess: () => signIn.reset(), onError: failed })}
      leaving={logout.isPending}
      onFailed={failed}
    />
  )
}

/** Why the link leads nowhere, from the invite's state; null while it waits for an answer. */
function goneFor(invite: InviteCard): InviteGone | null {
  switch (invite.state) {
    case 'pending':
      return null
    case 'expired':
      return 'expired'
    case 'cancelled':
      return 'cancelled'
    case 'accepted':
    case 'declined':
      return 'answered'
  }
}

/**
 * Signed in and named: the invite is theirs when it's among this number's open invites (`GET /me/invites`, the api
 * matches by phone); the answers go by the invite's id as on the sign-in page.
 */
function SignedInInvite({
  me,
  invite,
  onGone,
  onOtherNumber,
  leaving,
  onFailed,
}: {
  me: Me
  invite: InviteCard
  onGone: () => void
  onOtherNumber: () => void
  leaving: boolean
  onFailed: (error: unknown) => void
}) {
  const t = useTranslations('login')
  const sdk = useSdk()
  const navigate = useNavigate()
  const mine = useQuery(sdk.team.myInvites())
  const accept = useMutation(sdk.team.accept())
  const decline = useMutation(sdk.team.decline())
  const name = me.name ?? me.firstName
  const who = (phone: string) => (name ? t('who', { name, phone }) : phone)

  if (!mine.data) return mine.isError ? <FailedStep onRetry={() => void mine.refetch()} /> : <WaitStep />
  const own = mine.data.items.find((i) => i.id === invite.id)
  if (!own)
    return <InviteOtherNumberStep invite={invite} who={who(formatPhone(me.phone))} onOtherNumber={onOtherNumber} leaving={leaving} />

  // answered or expired meanwhile: the link's card says what the invite is now
  const failed = (error: unknown) => {
    if (isApiError(error, 'invite_expired') || isApiError(error, 'invite_answered') || isApiError(error, 'not_found')) onGone()
    onFailed(error)
  }
  return (
    <InviteStep
      invite={own}
      // the invited number is masked on the invite card (B-Login), as on the owner's invite row
      who={who(maskPhone(me.phone))}
      onOtherNumber={onOtherNumber}
      leaving={leaving}
      accepting={accept.isPending}
      declining={decline.isPending}
      onAccept={() =>
        accept.mutate(own.id, {
          // straight into its calendar, as drawn (B-07; the api made it the last used)
          onSuccess: (workspace) => void navigate({ to: '/w/$slug/calendar', params: { slug: workspace.slug }, replace: true }),
          onError: failed,
        })
      }
      onDecline={() =>
        decline.mutate(own.id, {
          onSuccess: () => {
            toast(t('invite.declined', { business: own.business.name }))
            void navigate({ to: '/login', replace: true })
          },
          onError: failed,
        })
      }
    />
  )
}

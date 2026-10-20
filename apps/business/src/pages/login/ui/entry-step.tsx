import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type { Me } from '@yeral/contract/account'
import type { InviteCard } from '@yeral/contract/team'
import { formatPhone, maskPhone } from '@yeral/domain/phone'
import { isApiError } from '@yeral/sdk'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { entryOf, type Entry } from '../model/entry'
import { InviteStep } from './invite-step'
import { InviteExpiredStep, NoWorkspaceStep } from './no-workspace-steps'
import { OpeningStep } from './opening-step'
import { FailedStep, WaitStep } from './wait-steps'

/**
 * After the sign-in (and the name): where the person goes, from their invites and workspaces (`entryOf`). It answers
 * the invites itself: the invite card goes as soon as the invites reload, and the answer must still land here.
 */
export function EntryStep({
  me,
  declined,
  onDeclined,
  onOtherNumber,
  leaving,
  onFailed,
}: {
  me: Me
  declined: string | null
  onDeclined: (business: string) => void
  onOtherNumber: () => void
  leaving: boolean
  onFailed: (error: unknown) => void
}) {
  const t = useTranslations('login')
  const sdk = useSdk()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const invites = useQuery(sdk.team.myInvites())
  const workspaces = useQuery(sdk.team.workspaces())
  const accept = useMutation(sdk.team.accept())
  const decline = useMutation(sdk.team.decline())
  // the invite being answered stays on screen until the answer is in
  const [answering, setAnswering] = useState<InviteCard | null>(null)
  // when the person arrived: the expired card's week counts from here
  const [now] = useState(() => Date.now())
  const name = me.name ?? me.firstName
  const who = (phone: string) => (name ? t('who', { name, phone }) : phone)

  // a failed refetch keeps what was loaded on screen; only nothing loaded at all is a failure
  if (!invites.data || !workspaces.data) {
    if (!invites.isError && !workspaces.isError) return <WaitStep />
    return (
      <FailedStep
        onRetry={() => {
          void invites.refetch()
          void workspaces.refetch()
        }}
      />
    )
  }

  // answered or expired meanwhile: the card goes, the invites say what they are now
  const failed = (error: unknown) => {
    setAnswering(null)
    if (isApiError(error, 'invite_expired') || isApiError(error, 'invite_answered') || isApiError(error, 'not_found'))
      void invites.refetch()
    onFailed(error)
  }

  const entry: Entry = answering
    ? { kind: 'invite', invite: answering }
    : entryOf(invites.data.items, workspaces.data, { declined: declined !== null, now })
  const line = { who: who(formatPhone(me.phone)), onOtherNumber, leaving }
  // the invited number is masked on the invite and expired cards (B-Login), as on the owner's invite row
  const masked = who(maskPhone(me.phone))
  switch (entry.kind) {
    case 'invite': {
      const { invite } = entry
      return (
        <InviteStep
          key={invite.id}
          {...line}
          who={masked}
          invite={invite}
          accepting={accept.isPending}
          declining={decline.isPending}
          onAccept={() => {
            setAnswering(invite)
            accept.mutate(invite.id, {
              // the invites have reloaded by now: another one waiting shows next; with none, the workspace just joined
              // opens at once, as drawn (the api made it the last used)
              onSuccess: (joined) => {
                const waiting = queryClient
                  .getQueryData(sdk.team.myInvites().queryKey)
                  ?.items.some((i) => i.state === 'pending' && i.id !== invite.id)
                if (waiting) setAnswering(null)
                else void navigate({ to: '/w/$slug/calendar', params: { slug: joined.slug } })
              },
              onError: failed,
            })
          }}
          onDecline={() => {
            setAnswering(invite)
            decline.mutate(invite.id, {
              onSuccess: () => {
                setAnswering(null)
                onDeclined(invite.business.name)
              },
              onError: failed,
            })
          }}
        />
      )
    }
    case 'opening':
      return <OpeningStep workspace={entry.workspace} count={entry.count} current={workspaces.data.current} declined={declined} />
    case 'expired':
      return <InviteExpiredStep {...line} who={masked} invite={entry.invite} />
    case 'empty':
      return <NoWorkspaceStep {...line} declined={declined} />
  }
}

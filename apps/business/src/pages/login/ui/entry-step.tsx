import { useMutation, useQuery } from '@tanstack/react-query'
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
  const invites = useQuery(sdk.team.myInvites())
  const workspaces = useQuery(sdk.team.workspaces())
  const accept = useMutation(sdk.team.accept())
  const decline = useMutation(sdk.team.decline())
  // the invite being answered stays on screen until the answer is in
  const [answering, setAnswering] = useState<InviteCard | null>(null)
  const name = me.name ?? me.firstName
  const who = (phone: string) => (name ? t('who', { name, phone }) : phone)

  // accepted: the person is on the team, and that workspace opens (and becomes the last used); a later refetch that
  // fails doesn't take it away
  if (accept.isSuccess)
    return (
      <OpeningStep
        workspace={accept.data}
        count={Math.max(1, workspaces.data?.items.length ?? 1)}
        current={workspaces.data?.current ?? null}
      />
    )
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
    : entryOf(invites.data.items, workspaces.data, { declined: declined !== null })
  const line = { who: who(formatPhone(me.phone)), onOtherNumber, leaving }
  switch (entry.kind) {
    case 'invite': {
      const { invite } = entry
      return (
        <InviteStep
          key={invite.id}
          {...line}
          // the invited number is masked on the card (B-Login), as on the owner's invite row
          who={who(maskPhone(me.phone))}
          invite={invite}
          accepting={accept.isPending}
          declining={decline.isPending}
          onAccept={() => {
            setAnswering(invite)
            accept.mutate(invite.id, { onSuccess: () => setAnswering(null), onError: failed })
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
      return <OpeningStep workspace={entry.workspace} count={entry.count} current={workspaces.data.current} />
    case 'expired':
      return <InviteExpiredStep {...line} invite={entry.invite} />
    case 'empty':
      return <NoWorkspaceStep {...line} declined={declined} />
  }
}

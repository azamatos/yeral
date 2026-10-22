import { useMutation, useQuery } from '@tanstack/react-query'
import { Navigate } from '@tanstack/react-router'
import type { Me } from '@yeral/contract/account'
import type { InviteCard } from '@yeral/contract/team'
import { formatPhone, maskPhone } from '@yeral/domain/phone'
import { isApiError } from '@yeral/sdk'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { entryOf, waitsForSetup, type Entry } from '../model/entry'
import { ContinueSetupStep } from './continue-setup-step'
import { InviteStep } from './invite-step'
import { InviteExpiredStep, NoWorkspaceStep } from './no-workspace-steps'
import { OpeningStep } from './opening-step'
import { FailedStep, WaitStep } from './wait-steps'

/**
 * After the sign-in (and the name): where the person goes, from their invites, workspaces and unfinished setup
 * (`entryOf`). It answers
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
  const setup = useQuery(sdk.setup.mine())
  const accept = useMutation(sdk.team.accept())
  const decline = useMutation(sdk.team.decline())
  // the invite being answered stays on screen until the answer is in
  const [answering, setAnswering] = useState<InviteCard | null>(null)
  // invites answered here leave the list at once, whatever a refetch says (it may fail)
  const [answered, setAnswered] = useState<readonly string[]>([])
  // the workspace just joined, while that Accept is the latest answer: with no invite left, its calendar opens at once
  const [joined, setJoined] = useState<string | null>(null)
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

  const open = invites.data.items.filter((i) => !answered.includes(i.id))
  const entry: Entry = answering
    ? { kind: 'invite', invite: answering }
    : entryOf(open, workspaces.data, setup.data?.setup ?? null, { declined: declined !== null, now })
  // accepted with nothing else waiting: straight into its calendar, as drawn (B-07; the api made it the last used)
  if (joined && entry.kind !== 'invite') return <Navigate to="/w/$slug/calendar" params={{ slug: joined }} replace />
  // the setup decides only when nothing comes before it: an invite or a workspace doesn't wait for it
  if (!setup.data && waitsForSetup(entry)) {
    if (!setup.isError) return <WaitStep />
    return <FailedStep onRetry={() => void setup.refetch()} />
  }
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
              // another invite waiting shows next; with none, the workspace just joined opens (above)
              onSuccess: (workspace) => {
                setAnswered((ids) => [...ids, invite.id])
                setJoined(workspace.slug)
                setAnswering(null)
              },
              onError: failed,
            })
          }}
          onDecline={() => {
            setAnswering(invite)
            decline.mutate(invite.id, {
              // the decline is the latest answer: it's confirmed on the card that comes next, even after an Accept
              onSuccess: () => {
                setAnswered((ids) => [...ids, invite.id])
                setJoined(null)
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
    case 'setup':
      return <ContinueSetupStep {...line} setup={entry.setup} />
    case 'expired':
      return <InviteExpiredStep {...line} who={masked} invite={entry.invite} />
    case 'empty':
      return <NoWorkspaceStep {...line} declined={declined} />
  }
}

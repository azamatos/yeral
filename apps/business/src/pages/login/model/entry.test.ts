import type { InviteCard, Workspace } from '@yeral/contract/team'
import { describe, expect, it } from 'vitest'
import { EXPIRED_INVITE_SHOWN_DAYS } from '@yeral/domain/team'
import { entryOf } from './entry'

const city = { id: 'ashgabat', name: 'Ashgabat' }
const workspace = (slug: string, lastOpenedAt: number | null = null): Workspace => ({
  slug,
  name: slug,
  address: '247 Bitarap Türkmenistan Avenue',
  city,
  logo: null,
  level: 'owner',
  status: 'live',
  statusReason: null,
  specialization: null,
  reviewsToAnswer: 0,
  requestsToAnswer: 0,
  lastOpenedAt,
})
const invite = (id: string, state: InviteCard['state'], expiresAt = 0): InviteCard => ({
  id,
  business: {
    slug: 'glow-studio',
    name: 'Glow Studio',
    category: 'Beauty',
    address: '247 Bitarap Türkmenistan Avenue',
    city,
    logo: null,
  },
  invitedBy: 'Maýsa Annaýewa',
  level: 'specialist',
  answersRequests: true,
  state,
  sentAt: expiresAt - 7 * 86_400_000,
  expiresAt,
})

const now = 1_000 * 86_400_000

describe('entryOf', () => {
  it('shows a waiting invite before anything else, the oldest first', () => {
    const entry = entryOf(
      [invite('a', 'expired', now - 5), invite('b', 'pending'), invite('c', 'pending')],
      { items: [workspace('home')], current: 'home' },
      { now },
    )
    expect(entry).toMatchObject({ kind: 'invite', invite: { id: 'b' } })
  })

  it('opens the workspace used last', () => {
    const entry = entryOf([], { items: [workspace('glow-studio'), workspace('home')], current: 'home' }, { now })
    expect(entry).toMatchObject({ kind: 'opening', workspace: { slug: 'home' }, count: 2 })
  })

  it('without a current one, the latest opened, else the first', () => {
    expect(entryOf([], { items: [workspace('a', 1), workspace('b', 5)], current: null }, { now })).toMatchObject({
      workspace: { slug: 'b' },
    })
    expect(entryOf([], { items: [workspace('a'), workspace('b')], current: null }, { now })).toMatchObject({ workspace: { slug: 'a' } })
  })

  it('a member never lands on an expired invite', () => {
    expect(entryOf([invite('a', 'expired', now - 5)], { items: [workspace('home')], current: null }, { now })).toMatchObject({
      kind: 'opening',
    })
  })

  it('with no workspace, the latest expired invite says why', () => {
    const entry = entryOf([invite('a', 'expired', now - 9), invite('b', 'expired', now - 5)], { items: [], current: null }, { now })
    expect(entry).toMatchObject({ kind: 'expired', invite: { id: 'b' } })
  })

  it('an invite that ended over a week ago gives way to no workspace yet (the expired card has no way on)', () => {
    const ended = (ago: number) => entryOf([invite('a', 'expired', now - ago)], { items: [], current: null }, { now })
    const week = EXPIRED_INVITE_SHOWN_DAYS * 86_400_000
    expect(ended(week - 1)).toMatchObject({ kind: 'expired' })
    expect(ended(week)).toEqual({ kind: 'empty' })
  })

  it('right after a decline, no workspace yet (with the decline on top), not an older expired invite', () => {
    expect(entryOf([invite('a', 'expired', now - 5)], { items: [], current: null }, { declined: true, now })).toEqual({ kind: 'empty' })
  })

  it('else: no workspace yet', () => {
    expect(entryOf([], { items: [], current: null }, { now })).toEqual({ kind: 'empty' })
  })
})

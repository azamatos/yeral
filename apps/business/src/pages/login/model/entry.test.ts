import type { Setup } from '@yeral/contract/setup'
import type { InviteCard, Workspace } from '@yeral/contract/team'
import { describe, expect, it } from 'vitest'
import { EXPIRED_INVITE_SHOWN_DAYS } from '@yeral/domain/team'
import { entryOf, setupProgress } from './entry'

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

const setup = (step: Setup['step']): Setup => ({
  slug: 'glow-studio',
  name: 'Glow Studio',
  step,
  category: 'Beauty',
  categoryId: 'beauty',
  services: 0,
  team: 0,
  rules: null,
  logo: null,
  address: { line: '247 Bitarap Türkmenistan Avenue', city },
})

const now = 1_000 * 86_400_000

describe('entryOf', () => {
  it('shows a waiting invite before anything else, the oldest first', () => {
    const entry = entryOf(
      [invite('a', 'expired', now - 5), invite('b', 'pending'), invite('c', 'pending')],
      { items: [workspace('home')], current: 'home' },
      null,
      { now },
    )
    expect(entry).toMatchObject({ kind: 'invite', invite: { id: 'b' } })
  })

  it('opens the workspace used last', () => {
    const entry = entryOf([], { items: [workspace('glow-studio'), workspace('home')], current: 'home' }, null, { now })
    expect(entry).toMatchObject({ kind: 'opening', workspace: { slug: 'home' }, count: 2 })
  })

  it('without a current one, the latest opened, else the first', () => {
    expect(entryOf([], { items: [workspace('a', 1), workspace('b', 5)], current: null }, null, { now })).toMatchObject({
      workspace: { slug: 'b' },
    })
    expect(entryOf([], { items: [workspace('a'), workspace('b')], current: null }, null, { now })).toMatchObject({
      workspace: { slug: 'a' },
    })
  })

  it('a member never lands on an expired invite', () => {
    expect(entryOf([invite('a', 'expired', now - 5)], { items: [workspace('home')], current: null }, null, { now })).toMatchObject({
      kind: 'opening',
    })
  })

  it('with no workspace, the latest expired invite says why', () => {
    const entry = entryOf([invite('a', 'expired', now - 9), invite('b', 'expired', now - 5)], { items: [], current: null }, null, { now })
    expect(entry).toMatchObject({ kind: 'expired', invite: { id: 'b' } })
  })

  it('an invite that ended over a week ago gives way to no workspace yet (the expired card has no way on)', () => {
    const ended = (ago: number) => entryOf([invite('a', 'expired', now - ago)], { items: [], current: null }, null, { now })
    const week = EXPIRED_INVITE_SHOWN_DAYS * 86_400_000
    expect(ended(week - 1)).toMatchObject({ kind: 'expired' })
    expect(ended(week)).toEqual({ kind: 'empty' })
  })

  it('right after a decline, no workspace yet (with the decline on top), not an older expired invite', () => {
    expect(entryOf([invite('a', 'expired', now - 5)], { items: [], current: null }, null, { declined: true, now })).toEqual({
      kind: 'empty',
    })
  })

  it('else: no workspace yet', () => {
    expect(entryOf([], { items: [], current: null }, null, { now })).toEqual({ kind: 'empty' })
  })

  describe('an unfinished setup (Q-200)', () => {
    const none = { items: [], current: null }

    it('reopens the setup, never the no-workspace card, even right after a decline', () => {
      expect(entryOf([], none, setup('hours'), { now })).toEqual({ kind: 'setup', setup: setup('hours') })
      expect(entryOf([], none, setup('hours'), { declined: true, now })).toMatchObject({ kind: 'setup' })
    })

    it('comes before an expired invite, after a waiting invite and a workspace', () => {
      expect(entryOf([invite('a', 'expired', now - 5)], none, setup('team'), { now })).toMatchObject({ kind: 'setup' })
      expect(entryOf([invite('b', 'pending')], none, setup('team'), { now })).toMatchObject({ kind: 'invite' })
      expect(entryOf([], { items: [workspace('home')], current: 'home' }, setup('team'), { now })).toMatchObject({ kind: 'opening' })
    })

    it('only the cards after it wait for it: a waiting invite or a workspace goes ahead while it is unknown', () => {
      expect(entryOf([], none, undefined, { now })).toEqual({ kind: 'pending' })
      expect(entryOf([invite('a', 'expired', now - 5)], none, undefined, { now })).toEqual({ kind: 'pending' })
      expect(entryOf([invite('b', 'pending')], none, undefined, { now })).toMatchObject({ kind: 'invite' })
      expect(entryOf([], { items: [workspace('home')], current: 'home' }, undefined, { now })).toMatchObject({ kind: 'opening' })
    })
  })
})

describe('setupProgress', () => {
  it('numbers the saved step among the 8, the phone first (B-Login: "Step 4 of 8 · Hours", 3 done)', () => {
    expect(setupProgress('hours')).toEqual({
      n: 4,
      total: 8,
      done: 3,
      before: ['business', 'address'],
      ahead: ['hours', 'services', 'team', 'rules'],
    })
  })

  it('at the business step nothing of the draft is done; at the last step nothing is ahead', () => {
    expect(setupProgress('business')).toMatchObject({ n: 2, done: 1, before: [] })
    expect(setupProgress('done')).toMatchObject({ n: 8, done: 7, ahead: [] })
  })
})

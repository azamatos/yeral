import type { InviteCard, Workspace } from '@yeral/contract/team'
import { describe, expect, it } from 'vitest'
import { entryOf } from './entry'

const city = { id: 'ashgabat', name: 'Ashgabat' }
const workspace = (slug: string, lastOpenedAt: number | null = null): Workspace => ({
  slug,
  name: slug,
  address: '247 Bitarap Türkmenistan Avenue',
  city,
  photo: null,
  level: 'owner',
  requestsToAnswer: 0,
  lastOpenedAt,
})
const invite = (id: string, state: InviteCard['state'], expiresAt = 0): InviteCard => ({
  id,
  business: { slug: 'glow-studio', name: 'Glow Studio', category: 'Beauty', address: '247 Bitarap Türkmenistan Avenue', city, photo: null },
  invitedBy: 'Maýsa Annaýewa',
  level: 'specialist',
  state,
  sentAt: expiresAt - 7 * 86_400_000,
  expiresAt,
})

describe('entryOf', () => {
  it('shows a waiting invite before anything else, the oldest first', () => {
    const entry = entryOf([invite('a', 'expired'), invite('b', 'pending'), invite('c', 'pending')], {
      items: [workspace('home')],
      current: 'home',
    })
    expect(entry).toMatchObject({ kind: 'invite', invite: { id: 'b' } })
  })

  it('opens the workspace used last', () => {
    const entry = entryOf([], { items: [workspace('glow-studio'), workspace('home')], current: 'home' })
    expect(entry).toMatchObject({ kind: 'opening', workspace: { slug: 'home' }, count: 2 })
  })

  it('without a current one, the latest opened, else the first', () => {
    expect(entryOf([], { items: [workspace('a', 1), workspace('b', 5)], current: null })).toMatchObject({ workspace: { slug: 'b' } })
    expect(entryOf([], { items: [workspace('a'), workspace('b')], current: null })).toMatchObject({ workspace: { slug: 'a' } })
  })

  it('a member never lands on an expired invite', () => {
    expect(entryOf([invite('a', 'expired', 5)], { items: [workspace('home')], current: null })).toMatchObject({ kind: 'opening' })
  })

  it('with no workspace, the latest expired invite says why', () => {
    const entry = entryOf([invite('a', 'expired', 5), invite('b', 'expired', 9)], { items: [], current: null })
    expect(entry).toMatchObject({ kind: 'expired', invite: { id: 'b' } })
  })

  it('else: no workspace yet', () => {
    expect(entryOf([], { items: [], current: null })).toEqual({ kind: 'empty' })
  })
})

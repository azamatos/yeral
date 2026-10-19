import { describe, expect, it } from 'vitest'
import { INVITE_DAYS, inviteExpiresAt, inviteState } from './team'

const SENT = Date.parse('2026-10-14T06:00:00Z')
const DAY = 86_400_000

describe('invites (book chapter 3)', () => {
  it('are valid for 7 days', () => {
    expect(INVITE_DAYS).toBe(7)
    expect(inviteExpiresAt(SENT)).toBe(SENT + 7 * DAY)
  })

  it('read as expired once unanswered past their end', () => {
    const invite = { status: 'pending' as const, expiresAt: inviteExpiresAt(SENT) }
    expect(inviteState(invite, SENT + 6 * DAY)).toBe('pending')
    expect(inviteState(invite, SENT + 7 * DAY)).toBe('expired')
  })

  it('keep their answer', () => {
    for (const status of ['accepted', 'declined', 'cancelled'] as const) {
      expect(inviteState({ status, expiresAt: SENT }, SENT + 30 * DAY)).toBe(status)
    }
  })
})

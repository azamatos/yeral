/**
 * Joining a team (book chapter 3, "Joining, leaving and handing over"; ADR 0025). The owner invites by phone; the
 * person with that phone signs in and accepts or declines within 7 days; resending starts a new 7 days.
 */

export const INVITE_DAYS = 7

/** What the stored answer means now: an unanswered invite past its end reads as expired (no job needed). */
export type InviteState = 'pending' | 'expired' | 'accepted' | 'declined' | 'cancelled'

export function inviteState(
  invite: { status: 'pending' | 'accepted' | 'declined' | 'cancelled'; expiresAt: number },
  now = Date.now(),
): InviteState {
  if (invite.status !== 'pending') return invite.status
  return now < invite.expiresAt ? 'pending' : 'expired'
}

/** When an invite sent at `sentAt` stops being valid. */
export const inviteExpiresAt = (sentAt: number): number => sentAt + INVITE_DAYS * 86_400_000

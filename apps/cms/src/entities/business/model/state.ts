import type { AdminBusinessItem } from '@yeral/contract/admin'

export type BusinessState = 'draft' | 'closed' | 'hidden' | 'rejected' | 'review' | 'recheck' | 'verified'

/**
 * The one thing the team reads first about a business: what stops it being live comes before the verdict; a live one
 * that changed something checked, or whose new name waits, is to check again (book Q-215, Q-275).
 */
export function businessState(
  b: Pick<AdminBusinessItem, 'setupStep' | 'closed' | 'hidden' | 'verification' | 'recheck' | 'pendingName'>,
): BusinessState {
  if (b.setupStep) return 'draft'
  if (b.closed) return 'closed'
  if (b.hidden) return 'hidden'
  if (b.verification === 'rejected') return 'rejected'
  if (b.verification === 'pending') return 'review'
  return b.recheck || b.pendingName ? 'recheck' : 'verified'
}

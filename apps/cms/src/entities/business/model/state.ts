import type { AdminBusinessItem } from '@yeral/contract/admin'

export type BusinessState = 'draft' | 'closed' | 'hidden' | 'rejected' | 'review' | 'moved' | 'verified'

/** The one thing the team reads first about a business: what stops it being live comes before the verdict. */
export function businessState(
  b: Pick<AdminBusinessItem, 'setupStep' | 'closed' | 'hidden' | 'verification' | 'addressChangedAt'>,
): BusinessState {
  if (b.setupStep) return 'draft'
  if (b.closed) return 'closed'
  if (b.hidden) return 'hidden'
  if (b.verification === 'rejected') return 'rejected'
  if (b.verification === 'pending') return 'review'
  return b.addressChangedAt ? 'moved' : 'verified'
}

import { useQuery } from '@tanstack/react-query'
import type { PageAddressCheck } from '@yeral/contract/settings'
import { slugProblem } from '@yeral/domain/setup'
import { useSdk } from '@/shared/api'
import { useDebounced } from '@/shared/lib'

type Problem = NonNullable<PageAddressCheck['problem']>

/**
 * Where a typed page address stands: nothing typed; the business's own; being checked; free; not checked (the check
 * failed: the save asks again); or a problem, with a free address like it for a taken or reserved one.
 */
export type PageAddressState =
  { status: 'idle' | 'own' | 'checking' | 'free' | 'unknown' } | { status: 'problem'; problem: Problem; suggestion: string | null }

/** Whether an address in this state may be saved: the save itself refuses one taken meanwhile. */
export const savable = (state: PageAddressState) => state.status === 'own' || state.status === 'free' || state.status === 'unknown'

/**
 * A page address as it's typed (chapter 9, 25.10.2026): the business's own as it is; the rules first, without asking;
 * then, after a pause in the typing, whether another business has it or had it (a reserved one is asked too, for a
 * free one like it). `business` is the asker's workspace, whose own addresses, now and before, are free to it.
 */
export function usePageAddressCheck(slug: string, { business, own }: { business?: string; own?: string } = {}): PageAddressState {
  const sdk = useSdk()
  const settled = useDebounced(slug, 300)
  const local = slug ? slugProblem(slug) : null
  const asks = !!slug && slug !== own && (local === null || local === 'reserved')
  const check = useQuery({
    ...sdk.settings.pageAddressCheck({ slug: settled, ...(business && { business }) }),
    enabled: asks && settled === slug,
  })
  const ruled = local && ({ status: 'problem', problem: local, suggestion: null } as const)
  if (!slug) return { status: 'idle' }
  if (slug === own) return { status: 'own' }
  if (!asks) return ruled || { status: 'checking' }
  if (settled !== slug || (!check.data && !check.isError)) return ruled || { status: 'checking' }
  if (!check.data) return ruled || { status: 'unknown' }
  return check.data.problem ? { status: 'problem', problem: check.data.problem, suggestion: check.data.suggestion } : { status: 'free' }
}

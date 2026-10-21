import { useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { useSdk } from '@/shared/api'

/**
 * The workspace on screen (`/w/{slug}`), the person, and every workspace of theirs. The route loads them before the
 * page shows (`/w/$slug` beforeLoad), so on screen they're there; a refetch keeps them while it runs.
 */
export function useWorkspace() {
  const sdk = useSdk()
  const { slug } = useParams({ from: '/w/$slug' })
  const me = useQuery(sdk.me.get()).data
  const workspaces = useQuery(sdk.team.workspaces()).data
  return { slug, me, workspaces, workspace: workspaces?.items.find((w) => w.slug === slug) }
}

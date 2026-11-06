import { createFileRoute } from '@tanstack/react-router'
import { InvitePage } from '@/pages/login'

/** The link in an invite (the api's `inviteLink`): it opens the invite, the sign-in stays the same. */
export const Route = createFileRoute('/invite/$token')({ component: InviteRoute })

function InviteRoute() {
  const { token } = Route.useParams()
  return <InvitePage token={token} />
}

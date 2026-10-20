import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { formatPhone } from '@yeral/domain/phone'
import { toast } from '@yeral/ui/toast'
import { useSdk } from '@/shared/api'
import { site } from '@/shared/config'
import { useErrorText } from '@/shared/i18n'
import { useWorkspace } from './use-workspace'

/**
 * The person in the account menu and the More sheet (book B-12 step 1): their name and number, the client site (the
 * same account) and logging out (back to the sign-in; the sdk forgets the person).
 */
export function useAccount() {
  const sdk = useSdk()
  const navigate = useNavigate()
  const errorText = useErrorText()
  const { me } = useWorkspace()
  const logout = useMutation(sdk.auth.logout())
  return {
    name: me ? (me.name ?? me.firstName ?? formatPhone(me.phone)) : '',
    phone: me ? formatPhone(me.phone) : '',
    client: { href: site.urls.client, host: new URL(site.urls.client).host },
    logout: () =>
      logout.mutate(undefined, {
        onSuccess: () => void navigate({ to: '/login', replace: true }),
        onError: (error) => void toast(errorText(error)),
      }),
  }
}

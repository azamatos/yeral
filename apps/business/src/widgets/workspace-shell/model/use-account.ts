import { useIsMutating, useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { formatPhone } from '@yeral/domain/phone'
import { toast } from '@yeral/ui/toast'
import { useSdk } from '@/shared/api'
import { site } from '@/shared/config'
import { useErrorText } from '@/shared/i18n'
import { useWorkspace } from './use-workspace'

/** One log-out for the whole shell, whichever menu asks: a second tap while it runs does nothing. */
const LOGOUT = ['shell', 'logout'] as const

/**
 * The person in the account menu, the More sheet and the switcher (book B-12 step 1): their name (the number when
 * they have none) and number, the client site (the same account) and logging out (back to the sign-in; the sdk
 * forgets the person).
 */
export function useAccount() {
  const sdk = useSdk()
  const navigate = useNavigate()
  const errorText = useErrorText()
  const { me } = useWorkspace()
  const logout = useMutation({ ...sdk.auth.logout(), mutationKey: LOGOUT })
  const leaving = useIsMutating({ mutationKey: LOGOUT }) > 0
  const named = me?.name ?? me?.firstName
  return {
    name: me ? (named ?? formatPhone(me.phone)) : '',
    phone: me ? formatPhone(me.phone) : '',
    /** They have a name: the switcher's sheet shows "name · number" under its title. */
    person: !!named,
    leaving,
    client: { href: site.urls.client, host: new URL(site.urls.client).host },
    logout: () =>
      !leaving &&
      logout.mutate(undefined, {
        onSuccess: () => void navigate({ to: '/login', replace: true }),
        onError: (error) => void toast(errorText(error)),
      }),
  }
}

import { useMutation } from '@tanstack/react-query'
import { useNavigate, useRouter } from '@tanstack/react-router'
import { useSdk } from '@yeral/sdk/react'
import { toast } from '@yeral/ui/toast'
import { useLocale } from 'use-intl'
import { useErrorText } from '@/shared/i18n'

/**
 * Log out on this device (book C-46; `POST /v1/auth/logout`; the sdk forgets the person). Where the page goes isn't
 * drawn: a public page stays and its routes reload (the header says «Log in» again); with `home` (the account area,
 * which needs someone signed in) it goes Home rather than to the login. A failure is a toast, and the trigger can try
 * again.
 */
export function useLogOut({ home = false, onDone }: { home?: boolean; onDone?: () => void } = {}) {
  const sdk = useSdk()
  const router = useRouter()
  const navigate = useNavigate()
  const locale = useLocale()
  const errorText = useErrorText()
  const logout = useMutation(sdk.auth.logout())
  return {
    logOut: () =>
      logout.mutate(undefined, {
        onSuccess: () => {
          onDone?.()
          if (home) void navigate({ to: '/$lang', params: { lang: locale }, replace: true })
          else void router.invalidate()
        },
        onError: (error) => void toast(errorText(error)),
      }),
    loggingOut: logout.isPending,
  }
}

import { useIsMutating, useMutation } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import { useSdk } from '@yeral/sdk/react'
import { toast } from '@yeral/ui/toast'
import { useErrorText } from '@/shared/i18n'

/** One log-out at a time, whichever «Log out» on the screen was pressed. */
const LOG_OUT = ['log-out'] as const

/**
 * Log out on this device (book C-46; `POST /v1/auth/logout`; the sdk forgets the person). Where the page goes isn't
 * drawn: the page stays and its routes reload, so the header says «Log in» again; the account area, which needs
 * someone signed in, takes the visitor Home itself (`AccountLayout`). A failure is a toast, and any trigger can try
 * again.
 */
export function useLogOut({ onDone }: { onDone?: () => void } = {}) {
  const sdk = useSdk()
  const router = useRouter()
  const errorText = useErrorText()
  const logout = useMutation({ ...sdk.auth.logout(), mutationKey: LOG_OUT })
  const loggingOut = useIsMutating({ mutationKey: LOG_OUT }) > 0
  return {
    logOut: () => {
      if (loggingOut) return
      logout.mutate(undefined, {
        onSuccess: () => {
          onDone?.()
          void router.invalidate()
        },
        onError: (error) => void toast(errorText(error)),
      })
    },
    loggingOut,
  }
}

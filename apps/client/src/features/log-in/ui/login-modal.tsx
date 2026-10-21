import { useQuery } from '@tanstack/react-query'
import { useSignIn } from '@yeral/features/auth-by-phone'
import { useSdk } from '@yeral/sdk/react'
import { Modal, ModalContent } from '@yeral/ui/modal'
import { toast } from '@yeral/ui/toast'
import { useEffect, useRef, useState, type ComponentProps } from 'react'
import { useErrorText } from '@/shared/i18n'
import { IdentityStep } from './identity-step'
import { NameStep } from './name-step'
import { SignInStep } from './sign-in-step'

/**
 * Logging in (Auth, book C-19; the same steps as C-18): a 400 modal, a bottom sheet under 768, over the page, which
 * keeps its state. The phone and the code; "Is this you?" for an account unused for 6 months; the name for a new
 * account. Signed in with a name, it calls `onSignedIn` and the opener closes it (the header then shows the avatar).
 * Closing it before the name leaves the person signed in; a booking asks for the name again.
 */
export function LoginModal({
  open,
  onOpenChange,
  onSignedIn,
  onCloseAutoFocus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Signed in and named: whoever opened the modal goes on (and closes it). */
  onSignedIn: () => void
  /** Where the focus goes when the modal closes (the trigger by default; the avatar once signed in). */
  onCloseAutoFocus?: ComponentProps<typeof ModalContent>['onCloseAutoFocus']
}) {
  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent
        size={400}
        // each step puts the focus where it starts (the number, the code, the name)
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={onCloseAutoFocus}
      >
        {/* mounted only while open: every opening starts from the number */}
        <LoginSteps onSignedIn={onSignedIn} />
      </ModalContent>
    </Modal>
  )
}

function LoginSteps({ onSignedIn }: { onSignedIn: () => void }) {
  const sdk = useSdk()
  const errorText = useErrorText()
  const me = useQuery(sdk.me.get())
  const [identity, setIdentity] = useState<{ name: string | null; ticket: string } | null>(null)
  const failed = (error: unknown) => void toast(errorText(error))
  const signIn = useSignIn({
    onVerified: (answer) => {
      if ('isThisYou' in answer) setIdentity(answer.isThisYou)
    },
    onFailed: failed,
  })

  // signed in (the code, "Is this you?" or the name step put `me` in the cache) with a name: done, once
  const done = Boolean(me.data?.firstName)
  const told = useRef(false)
  useEffect(() => {
    if (!done || told.current) return
    told.current = true
    onSignedIn()
  }, [done, onSignedIn])

  if (identity && !me.data)
    return (
      <IdentityStep
        {...identity}
        // signed in: the steps and their clocks are done
        onAnswered={() => {
          setIdentity(null)
          signIn.reset()
        }}
        onBack={() => {
          setIdentity(null)
          signIn.changeNumber()
        }}
        onExpired={(error) => {
          setIdentity(null)
          signIn.refuseCode(error)
        }}
        onFailed={failed}
      />
    )
  if (me.data && !me.data.firstName) return <NameStep phone={me.data.phone} onFailed={failed} />
  return <SignInStep signIn={signIn} />
}

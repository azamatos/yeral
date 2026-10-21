import { useMutation, useQuery } from '@tanstack/react-query'
import { useCodeOnScreen, useSignIn } from '@yeral/features/auth-by-phone'
import { toast } from '@yeral/ui/toast'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { usePageTitle } from '@/shared/lib'
import { EntryStep } from './entry-step'
import { IdentityStep } from './identity-step'
import { NameStep } from './name-step'
import { SignInStep } from './sign-in-step'
import { FailedStep, WaitStep } from './wait-steps'

/**
 * `/login` (B-Login, book B-07): the phone and the code; "Is this you?" for an account unused for 6 months; the name
 * for someone without one; then an invite, the last used workspace, an expired invite, or no workspace yet. Someone
 * already signed in goes straight to where they belong.
 */
export function LoginPage() {
  const t = useTranslations('login')
  const sdk = useSdk()
  const errorText = useErrorText()
  const me = useQuery(sdk.me.get())
  // asked with the account, so the phone step's demo note is there when it opens
  useCodeOnScreen()
  const logout = useMutation(sdk.auth.logout())
  const [identity, setIdentity] = useState<{ name: string | null; ticket: string } | null>(null)
  const [declined, setDeclined] = useState<string | null>(null)
  usePageTitle(t('tabTitle'))

  // signed out (or the session ended on its own): the decline was that sign-in's, never the next one's
  const signedIn = !!me.data
  const [wasSignedIn, setWasSignedIn] = useState(signedIn)
  if (signedIn !== wasSignedIn) {
    setWasSignedIn(signedIn)
    if (!signedIn) setDeclined(null)
  }

  const failed = (error: unknown) => void toast(errorText(error))
  const signIn = useSignIn({
    onVerified: (answer) => {
      if ('isThisYou' in answer) setIdentity(answer.isThisYou)
    },
    onFailed: failed,
  })
  const startOver = () => {
    setDeclined(null)
    signIn.reset()
  }

  if (identity)
    return (
      <IdentityStep
        {...identity}
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
  if (me.isPending) return <WaitStep />
  // a failed refetch keeps the person on screen; only not knowing who is signed in at all is a failure
  if (me.isError && me.data === undefined) return <FailedStep onRetry={() => void me.refetch()} />
  if (!me.data) return <SignInStep signIn={signIn} />
  if (!me.data.firstName) return <NameStep phone={me.data.phone} onFailed={failed} />
  return (
    <EntryStep
      me={me.data}
      declined={declined}
      onDeclined={setDeclined}
      // «Log in with another number»: signed out, the phone step from the start
      onOtherNumber={() => logout.mutate(undefined, { onSuccess: startOver, onError: failed })}
      leaving={logout.isPending}
      onFailed={failed}
    />
  )
}

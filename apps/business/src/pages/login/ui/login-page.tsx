import { useQuery } from '@tanstack/react-query'
import { toast } from '@yeral/ui/toast'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk, useSignOut } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { usePageTitle } from '@/shared/lib'
import { useSignIn } from '../model/use-sign-in'
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
  const { signOut, signingOut, sessionEnded } = useSignOut()
  const [identity, setIdentity] = useState<{ name: string | null; ticket: string } | null>(null)
  const [declined, setDeclined] = useState<string | null>(null)
  usePageTitle(t('tabTitle'))

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
  if (me.isError) return <FailedStep onRetry={() => void me.refetch()} />
  if (!me.data) return <SignInStep signIn={signIn} />
  if (!me.data.firstName) return <NameStep phone={me.data.phone} onFailed={failed} />
  return (
    <EntryStep
      me={me.data}
      declined={declined}
      onDeclined={setDeclined}
      // «Log in with another number»: signed out, the phone step from the start
      onOtherNumber={() => signOut({ onDone: startOver, onFailed: failed })}
      leaving={signingOut}
      onSessionEnded={() => {
        sessionEnded()
        startOver()
      }}
      onFailed={failed}
    />
  )
}

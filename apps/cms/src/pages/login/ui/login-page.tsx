import { useMutation, useQuery } from '@tanstack/react-query'
import { Navigate } from '@tanstack/react-router'
import type { AdminSignInChallenge } from '@yeral/contract/admin'
import { isApiError } from '@yeral/sdk'
import { Button } from '@yeral/ui/button'
import { Field, FieldMessage } from '@yeral/ui/field'
import { Input } from '@yeral/ui/input'
import { textLink } from '@yeral/ui/text-link'
import { useState, type FormEvent } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { usePageTitle } from '@/shared/lib'
import { AuthPage } from '@/shared/ui'

/**
 * `/login` (book F-178, ADR 0026 amended 2026-11-06): two steps, as most platforms do it (owner, 04.11). The login and
 * the password first; right, the api answers a challenge for a few minutes, and the second step takes the
 * authenticator's code (or a recovery code) for it. A wrong code stays on the second step; a challenge that ran out
 * goes back to the first with a word why. A phone number never opens this tool. Someone signed in goes on.
 */
export function LoginPage() {
  const t = useTranslations()
  const sdk = useSdk()
  const errorText = useErrorText()
  const me = useQuery(sdk.admin.me())
  const start = useMutation(sdk.admin.signIn())
  const finish = useMutation(sdk.admin.signInCode())
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [challenge, setChallenge] = useState<AdminSignInChallenge | null>(null)
  /** Why the second step sent us back to the first (`sign_in_expired`). */
  const [sentBack, setSentBack] = useState<string | null>(null)
  const brand = t('common.brand')
  usePageTitle(t('login.tabTitle'))

  if (me.data) return <Navigate to="/businesses" replace />

  const submitPassword = (event: FormEvent) => {
    event.preventDefault()
    setSentBack(null)
    start.mutate(
      { login, password },
      {
        onSuccess: (made) => {
          setChallenge(made)
          // the password's work is done; the code is asked for fresh
          setPassword('')
          setCode('')
        },
      },
    )
  }

  const submitCode = (event: FormEvent) => {
    event.preventDefault()
    if (!challenge) return
    finish.mutate(
      { challenge: challenge.challenge, code },
      {
        // a code works once and the app's next one is coming: the form asks for it fresh
        onError: (error) => {
          setCode('')
          if (isApiError(error, 'sign_in_expired')) {
            setChallenge(null)
            setSentBack(errorText(error))
          }
        },
      },
    )
  }

  const change = () => {
    setChallenge(null)
    setCode('')
    finish.reset()
  }

  if (challenge) {
    return (
      <AuthPage
        title={t('login.codeTitle')}
        lead={
          <>
            {t.rich('login.signedInAs', { login: challenge.login, b: (chunks) => <b className="font-semibold text-n-900">{chunks}</b> })}{' '}
            <button type="button" onClick={change} className={textLink}>
              {t('login.change')}
            </button>
          </>
        }
      >
        <form onSubmit={submitCode} className="flex flex-col gap-4">
          <Field label={t('login.code')} hint={t('login.codeHint')}>
            <Input value={code} onChange={(e) => setCode(e.target.value)} autoComplete="one-time-code" inputMode="numeric" required />
          </Field>
          {finish.error && <FieldMessage>{errorText(finish.error)}</FieldMessage>}
          <Button type="submit" variant="primary" size="l" loading={finish.isPending} loadingLabel={t('login.checking')}>
            {t('login.submit')}
          </Button>
        </form>
      </AuthPage>
    )
  }

  return (
    <AuthPage title={t('login.title', { brand })} lead={t('login.lead', { brand })}>
      <form onSubmit={submitPassword} className="flex flex-col gap-4">
        <Field label={t('login.login')}>
          <Input value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" autoCapitalize="none" required />
        </Field>
        <Field label={t('login.password')}>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </Field>
        {start.error ? <FieldMessage>{errorText(start.error)}</FieldMessage> : sentBack && <FieldMessage>{sentBack}</FieldMessage>}
        <Button type="submit" variant="primary" size="l" loading={start.isPending} loadingLabel={t('login.checking')}>
          {t('login.continue')}
        </Button>
      </form>
    </AuthPage>
  )
}

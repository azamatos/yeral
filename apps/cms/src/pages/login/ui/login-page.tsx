import { useMutation, useQuery } from '@tanstack/react-query'
import { Navigate } from '@tanstack/react-router'
import { Button } from '@yeral/ui/button'
import { Field, FieldMessage } from '@yeral/ui/field'
import { Input } from '@yeral/ui/input'
import { useState, type FormEvent } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { usePageTitle } from '@/shared/lib'
import { AuthPage } from '@/shared/ui'

/**
 * `/login` (book F-178, ADR 0026): a login, a password and the authenticator's code (or a recovery code) on one form, so
 * a wrong part says nothing about which it was. A phone number never opens this tool. Someone signed in goes on.
 */
export function LoginPage() {
  const t = useTranslations()
  const sdk = useSdk()
  const errorText = useErrorText()
  const me = useQuery(sdk.admin.me())
  const signIn = useMutation(sdk.admin.signIn())
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const brand = t('common.brand')
  usePageTitle(t('login.tabTitle'))

  if (me.data) return <Navigate to="/businesses" replace />

  const submit = (event: FormEvent) => {
    event.preventDefault()
    // a code works once and the app's next one is coming: the form asks for it fresh
    signIn.mutate({ login, password, code }, { onError: () => setCode('') })
  }

  return (
    <AuthPage title={t('login.title', { brand })} lead={t('login.lead', { brand })}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label={t('login.login')}>
          <Input value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" autoCapitalize="none" required />
        </Field>
        <Field label={t('login.password')}>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </Field>
        <Field label={t('login.code')} hint={t('login.codeHint')}>
          <Input value={code} onChange={(e) => setCode(e.target.value)} autoComplete="one-time-code" required />
        </Field>
        {signIn.error && <FieldMessage>{errorText(signIn.error)}</FieldMessage>}
        <Button type="submit" variant="primary" size="l" loading={signIn.isPending} loadingLabel={t('login.checking')}>
          {t('login.submit')}
        </Button>
      </form>
    </AuthPage>
  )
}

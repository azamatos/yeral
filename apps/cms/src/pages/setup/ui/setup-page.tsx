import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { adminPasswordSchema, type AdminSetupSecret } from '@yeral/contract/admin'
import { isApiError } from '@yeral/sdk'
import { Button } from '@yeral/ui/button'
import { Checkbox } from '@yeral/ui/checkbox'
import { CopyField } from '@yeral/ui/copy-field'
import { Field, FieldMessage } from '@yeral/ui/field'
import { Input } from '@yeral/ui/input'
import { QrCode } from '@yeral/ui/qr-block'
import { Skeleton } from '@yeral/ui/skeleton'
import { useId, useState, type FormEvent } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { usePageTitle } from '@/shared/lib'
import { AuthPage, RecoveryCodes } from '@/shared/ui'

/** `adminPasswordSchema`'s own minimum, so the form and the api never disagree. */
const PASSWORD_MIN = adminPasswordSchema.minLength ?? 12

/**
 * `/setup/$token` (ADR 0026): the link a teammate or the server command made, good for 24 hours. A password, the
 * authenticator with its QR code and first code, then the recovery codes, shown once; the account is signed in by then.
 * A reload starts again at the password, which makes a new secret: nothing is half set up until the first code.
 */
export function SetupPage({ token }: { token: string }) {
  const t = useTranslations('setup')
  const sdk = useSdk()
  const errorText = useErrorText()
  const setup = useQuery(sdk.admin.setup(token))
  const [secret, setSecret] = useState<AdminSetupSecret | null>(null)
  const [codes, setCodes] = useState<string[] | null>(null)
  usePageTitle(t('tabTitle'))

  if (codes) return <CodesStep codes={codes} />
  if (secret) return <AppStep token={token} secret={secret} onConfirmed={setCodes} />
  if (setup.data) return <PasswordStep token={token} name={setup.data.name} login={setup.data.login} onSaved={setSecret} />
  if (setup.isPending)
    return (
      <AuthPage title={<Skeleton className="h-8 w-48" />}>
        <Skeleton className="h-44" />
      </AuthPage>
    )
  return (
    <AuthPage
      title={t(isApiError(setup.error, 'setup_expired') ? 'expiredTitle' : 'tabTitle')}
      lead={errorText(setup.error)}
      focusKey="expired"
    />
  )
}

function PasswordStep({
  token,
  name,
  login,
  onSaved,
}: {
  token: string
  name: string
  login: string
  onSaved: (secret: AdminSetupSecret) => void
}) {
  const t = useTranslations('setup')
  const sdk = useSdk()
  const errorText = useErrorText()
  const save = useMutation(sdk.admin.setupPassword(token))
  const [password, setPassword] = useState('')
  const [repeat, setRepeat] = useState('')
  const [tried, setTried] = useState(false)
  const short = password.length < PASSWORD_MIN
  const different = password !== repeat

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setTried(true)
    if (!short && !different) save.mutate({ password }, { onSuccess: onSaved })
  }

  return (
    <AuthPage
      title={t('passwordTitle', { name })}
      lead={t.rich('passwordLead', { login, min: PASSWORD_MIN, b: (chunks) => <b>{chunks}</b> })}
    >
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label={t('password')} error={tried && short ? t('tooShort', { min: PASSWORD_MIN }) : undefined}>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required />
        </Field>
        <Field label={t('repeat')} error={tried && !short && different ? t('mismatch') : undefined}>
          <Input type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)} autoComplete="new-password" required />
        </Field>
        {save.error && <FieldMessage>{errorText(save.error)}</FieldMessage>}
        <Button type="submit" variant="primary" size="l" loading={save.isPending}>
          {t('continue')}
        </Button>
      </form>
    </AuthPage>
  )
}

function AppStep({ token, secret, onConfirmed }: { token: string; secret: AdminSetupSecret; onConfirmed: (codes: string[]) => void }) {
  const t = useTranslations()
  const sdk = useSdk()
  const errorText = useErrorText()
  const confirm = useMutation(sdk.admin.setupConfirm(token))
  const [code, setCode] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    confirm.mutate({ code }, { onSuccess: (answer) => onConfirmed(answer.codes), onError: () => setCode('') })
  }

  return (
    <AuthPage title={t('setup.appTitle')} lead={t('setup.appLead')} focusKey="app">
      <form onSubmit={submit} className="flex flex-col gap-4">
        <QrCode value={secret.uri} label={t('setup.qrLabel')} px={180} className="self-center" />
        <CopyField value={secret.secret} label={t('setup.secret')} copy={{ copy: t('recovery.copy'), copied: t('recovery.copied') }} />
        <Field label={t('setup.code')}>
          <Input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" required />
        </Field>
        {confirm.error && <FieldMessage>{errorText(confirm.error)}</FieldMessage>}
        <Button type="submit" variant="primary" size="l" loading={confirm.isPending}>
          {t('setup.confirm')}
        </Button>
      </form>
    </AuthPage>
  )
}

function CodesStep({ codes }: { codes: string[] }) {
  const t = useTranslations()
  const navigate = useNavigate()
  const [saved, setSaved] = useState(false)
  const savedId = useId()
  return (
    <AuthPage title={t('setup.codesTitle')} lead={t('setup.codesLead')} focusKey="codes">
      <div className="flex flex-col gap-4">
        <RecoveryCodes codes={codes} />
        <label htmlFor={savedId} className="flex items-center gap-2.5 text-small text-n-900">
          <Checkbox id={savedId} checked={saved} onChange={(e) => setSaved(e.target.checked)} />
          {t('setup.saved')}
        </label>
        <Button variant="primary" size="l" disabled={!saved} onClick={() => void navigate({ to: '/businesses', replace: true })}>
          {t('setup.finish', { brand: t('common.brand') })}
        </Button>
      </div>
    </AuthPage>
  )
}

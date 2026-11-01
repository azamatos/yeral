import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { isApiError } from '@yeral/sdk'
import { Button } from '@yeral/ui/button'
import { Spinner } from '@yeral/ui/spinner'
import { useEffect, useRef } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { usePageTitle } from '@/shared/lib'
import { AuthPage } from '@/shared/ui'

/**
 * `/try`, «Try the business app» (book F-242): a day in the shared demo workspace as its owner, with no sign-in. It lives
 * here and not on the client site because the demo's cookie is read only for this app's Origin (ADR 0019), so the client
 * site links to this address. Where the demo is off the api answers `not_found`, and the page says so.
 */
export function TryPage() {
  const t = useTranslations('try')
  const sdk = useSdk()
  const navigate = useNavigate()
  const errorText = useErrorText()
  const start = useMutation(sdk.demo.start())
  const { mutate, error } = start
  usePageTitle(t('tabTitle'))

  // once: StrictMode's second effect would start a second session
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    mutate(undefined, {
      onSuccess: ({ slug }) => void navigate({ to: '/w/$slug/calendar', params: { slug }, replace: true }),
    })
  }, [mutate, navigate])

  if (!error)
    return (
      <AuthPage align="center" title={t('opening')} aria-busy>
        <Spinner className="size-6 text-a-500" />
      </AuthPage>
    )
  return (
    <AuthPage focusKey="failed" title={t('offTitle')} lead={isApiError(error, 'not_found') ? t('offLead') : errorText(error)}>
      <Button asChild variant="primary" size="l">
        <Link to="/login">{t('logIn')}</Link>
      </Button>
    </AuthPage>
  )
}

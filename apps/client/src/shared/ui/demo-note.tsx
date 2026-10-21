import { useQuery } from '@tanstack/react-query'
import { Callout } from '@yeral/ui/callout'
import { FlaskConical } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@yeral/sdk/react'

/**
 * The first launch's note on the sign-in (book Q-036, F-200): while the code shows on the screen a number proves
 * nothing, so the phone step says it's a demo and asks for a made-up number (`GET /v1/auth/mode`).
 */
export function DemoNote() {
  const sdk = useSdk()
  const t = useTranslations()
  const mode = useQuery(sdk.auth.mode())
  if (!mode.data?.codeOnScreen) return null
  return (
    <Callout tone="neutral" size="s" icon={<FlaskConical />} live={false}>
      {t('login.demoNote', { brand: t('common.brand') })}
    </Callout>
  )
}

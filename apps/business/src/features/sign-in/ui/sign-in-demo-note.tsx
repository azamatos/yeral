import { useCodeOnScreen } from '@yeral/features/auth-by-phone'
import { Callout } from '@yeral/ui/callout'
import { FlaskConical } from 'lucide-react'
import { useTranslations } from 'use-intl'

/**
 * The first launch's note above the number (book Q-036, F-200; the owner's ask): while the code shows on the screen a
 * number proves nothing, so it's a demo with made-up numbers. Heard when it appears (a status), since the focus is
 * already in the number.
 */
export function SignInDemoNote() {
  const t = useTranslations()
  if (!useCodeOnScreen()) return null
  return (
    <Callout tone="neutral" size="s" icon={<FlaskConical />} live>
      {t('login.demoNote', { brand: t('common.brand') })}
    </Callout>
  )
}

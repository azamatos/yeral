import { Link } from '@tanstack/react-router'
import { Button } from '@yeral/ui/button'
import { useTranslations } from 'use-intl'
import { usePageTitle } from '@/shared/lib'
import { AuthPage } from '@/shared/ui'

/** Stands in for the setup wizard (`/setup/{step}`, P4 slice 2), where "Start free" and "Create a business" lead. */
export function SetupPage() {
  const t = useTranslations('placeholder')
  usePageTitle(t('setupTitle'))
  return (
    <AuthPage focusKey="setup" title={t('setupTitle')} lead={t('setupLead')}>
      <Button asChild variant="secondary" size="l" className="w-full">
        <Link to="/login">{t('toLogin')}</Link>
      </Button>
    </AuthPage>
  )
}

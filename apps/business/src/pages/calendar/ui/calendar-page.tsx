import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { Button } from '@yeral/ui/button'
import { toast } from '@yeral/ui/toast'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { usePageTitle } from '@/shared/lib'
import { AuthPage } from '@/shared/ui'

/**
 * Stands in for the calendar (`/w/{slug}/calendar`, P4 slice 4) so the sign-in has somewhere to open: the workspace,
 * the person's level and a way to sign out.
 */
export function CalendarPage() {
  const t = useTranslations()
  const { slug } = useParams({ from: '/w/$slug' })
  const sdk = useSdk()
  const navigate = useNavigate()
  const errorText = useErrorText()
  const workspaces = useQuery(sdk.team.workspaces())
  const logout = useMutation(sdk.auth.logout())
  const workspace = workspaces.data?.items.find((w) => w.slug === slug)
  const name = workspace?.name ?? slug
  usePageTitle(name)

  return (
    <AuthPage
      focusKey={slug}
      title={name}
      lead={workspace && t('placeholder.workspaceLead', { level: t(`levels.${workspace.level}`), city: workspace.city.name })}
    >
      <Button
        variant="secondary"
        size="l"
        className="w-full"
        loading={logout.isPending}
        onClick={() =>
          logout.mutate(undefined, { onSuccess: () => void navigate({ to: '/login' }), onError: (error) => void toast(errorText(error)) })
        }
      >
        {t('placeholder.logout')}
      </Button>
    </AuthPage>
  )
}

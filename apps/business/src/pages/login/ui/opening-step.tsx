import { useMutation } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import type { Workspace } from '@yeral/contract/team'
import { cn } from '@yeral/ui/cn'
import { ArrowRight } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { AuthPage, textLink } from '@/shared/ui'
import { BusinessMark } from './business-mark'
import { DeclinedLine } from './no-workspace-steps'

/** How long "Opening Glow Studio…" stays before the calendar opens; «Open the calendar now» skips it. */
export const OPENING_MS = 1500

/**
 * The last used workspace opens (B-Login `step=routing`, book B-07 step 4): its logo, name, the person's level and
 * city, and with several workspaces where to find the others. Right after declining an invite, the decline is
 * confirmed on top, as on the no-workspace card (book chapter 9, 21.10.2026).
 */
export function OpeningStep({
  workspace,
  count,
  current,
  declined = null,
}: {
  workspace: Workspace
  count: number
  current: string | null
  declined?: string | null
}) {
  const t = useTranslations()
  const sdk = useSdk()
  const navigate = useNavigate()
  const open = useMutation(sdk.team.open())
  const { slug } = workspace
  const title = t('login.opening.title', { business: workspace.name })

  // the one opened becomes the last used, when it wasn't (no workspace opened before)
  const { mutate } = open
  useEffect(() => {
    if (slug !== current) mutate(slug)
  }, [slug, current, mutate])
  useEffect(() => {
    const timer = setTimeout(() => void navigate({ to: '/w/$slug/calendar', params: { slug } }), OPENING_MS)
    return () => clearTimeout(timer)
  }, [navigate, slug])

  return (
    <AuthPage
      focusKey="opening"
      align="center"
      media={
        <>
          {declined && <DeclinedLine business={declined} />}
          <BusinessMark name={workspace.name} photo={workspace.photo} size={64} />
        </>
      }
      title={title}
      lead={t('login.opening.sub', { level: t(`levels.${workspace.level}`), city: workspace.city.name })}
    >
      <div role="progressbar" aria-label={title} className="relative h-1 w-full max-w-60 overflow-hidden rounded-pill bg-n-100">
        <span className="absolute inset-y-0 w-2/5 animate-[opening_1.2s_ease-in-out_infinite] rounded-pill bg-a-500 motion-reduce:left-0 motion-reduce:w-3/5 motion-reduce:animate-none" />
      </div>
      <p className="m-0 max-w-85 text-dense text-n-600">{count > 1 ? t('login.opening.many', { count }) : t('login.opening.one')}</p>
      <Link to="/w/$slug/calendar" params={{ slug }} className={cn(textLink, 'inline-flex items-center gap-1.5 text-small')}>
        {t('login.opening.now')}
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </AuthPage>
  )
}

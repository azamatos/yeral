import { Link } from '@tanstack/react-router'
import type { Workspace } from '@yeral/contract/team'
import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { Store } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { AuthPage } from '@/shared/ui'

const iconTile = 'flex size-12 flex-none items-center justify-center rounded-pill bg-group [&_svg]:size-5.5'

/**
 * "You already have a business" (the owner, 25.10.2026; book chapter 9): someone already in a workspace who opens the
 * setup without a draft, and without asking to create another (the switcher's «Create a business» does), picks first:
 * one of their businesses, as the switcher's rows show them (logo or letter tile, name, «level · city»), opens at its
 * calendar; «Create another business» goes on to the business step, since a second address is a business of its own
 * (design §28.5). On the sign-in's frame, as the login's other choices (B-Login).
 */
export function HasBusiness({ workspaces, onCreate }: { workspaces: Workspace[]; onCreate: () => void }) {
  const t = useTranslations('setup.hasBusiness')
  const tl = useTranslations('levels')
  return (
    <AuthPage
      focusKey="has-business"
      media={
        <span aria-hidden className={iconTile}>
          <Store />
        </span>
      }
      title={t('title', { count: workspaces.length })}
      lead={t('lead', { count: workspaces.length })}
    >
      <ul aria-label={t('list')} className="m-0 flex list-none flex-col p-0">
        {workspaces.map((w) => (
          <li key={w.slug} className="flex min-h-16 items-center gap-3 border-b border-n-200 py-2.5 first:border-t">
            <Avatar decorative name={w.name} src={w.logo?.url} size={36} shape="square" tone="neutral" letters={1} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[15px] leading-5 font-semibold text-n-900">{w.name}</span>
              <span className="truncate text-small text-n-600">{t('where', { level: tl(w.level), city: w.city.name })}</span>
            </span>
            <Button asChild variant="tint" size="s">
              <Link to="/w/$slug/calendar" params={{ slug: w.slug }} aria-label={t('openLabel', { name: w.name })}>
                {t('open')}
              </Link>
            </Button>
          </li>
        ))}
      </ul>
      <Button variant="secondary" size="l" className="w-full" onClick={onCreate}>
        {t('create')}
      </Button>
    </AuthPage>
  )
}

import { Link } from '@tanstack/react-router'
import { AccountMenu } from '@yeral/ui/account-menu'
import { cn } from '@yeral/ui/cn'
import { SideNav, SideNavDivider, SideNavItem } from '@yeral/ui/side-nav'
import { ExternalLink, Headset, LogOut, User } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { useContactYeral } from '@/features/contact-yeral'
import { sectionsFor } from '../model/sections'
import { useAccount } from '../model/use-account'
import { useWorkspace } from '../model/use-workspace'
import { SectionIcon } from './section-icon'
import { ShellSwitcher } from './shell-switcher'

/**
 * The sidebar (B-Shell): 248 from 1024, the 72 rail from 768 (`collapsed`). The switcher on top, the sections this
 * person's level has, the person at the bottom. The Bookings count is the requests they may answer here; Reviews counts
 * the reviews waiting for a reply, muted, for those who reply.
 */
export function ShellSidebar({
  collapsed = false,
  onProfile,
}: {
  collapsed?: boolean
  /** My profile, opened from the account menu (its button gets the focus back). */
  onProfile: (opener: HTMLElement | null) => void
}) {
  const t = useTranslations('shell')
  const contact = useContactYeral()
  const { slug, workspace } = useWorkspace()
  const account = useAccount()
  if (!workspace) return null
  const requests = workspace.requestsToAnswer
  const reviews = workspace.reviewsToAnswer
  return (
    <aside
      className={cn(
        'sticky top-0 h-dvh flex-none flex-col overflow-y-auto border-r border-n-200 bg-n-0',
        collapsed ? 'hidden w-18 items-center gap-1.5 py-3 sm:flex md:hidden' : 'hidden w-62 gap-0.5 p-3 md:flex',
      )}
    >
      <ShellSwitcher variant={collapsed ? 'rail' : 'sidebar'} className={collapsed ? 'mb-2' : undefined} />
      {!collapsed && <SideNavDivider />}
      <SideNav aria-label={t('menu')} collapsed={collapsed}>
        {sectionsFor(workspace.level).map((section) => (
          <SideNavItem
            key={section}
            asChild
            icon={<SectionIcon section={section} />}
            label={t(`sections.${section}`)}
            count={
              section === 'bookings' && requests > 0
                ? { count: requests, tone: 'attention', label: t('requests', { count: requests }) }
                : section === 'reviews'
                  ? { count: reviews, tone: 'muted', label: t('reviewsToAnswer', { count: reviews }) }
                  : null
            }
          >
            <Link to={`/w/$slug/${section}`} params={{ slug }} />
          </SideNavItem>
        ))}
      </SideNav>
      <div className="flex-1" />
      {!collapsed && <SideNavDivider />}
      <AccountMenu
        variant={collapsed ? 'rail' : 'block'}
        name={account.name}
        phone={account.phone}
        menuLabel={t('account.menu')}
        triggerLabel={collapsed ? t('account.triggerOf', { name: account.name }) : t('account.trigger')}
        items={[
          { id: 'profile', label: t('account.profile'), icon: <User />, onSelect: onProfile, opensDialog: true },
          {
            id: 'client',
            label: t('account.openAsClient'),
            icon: <ExternalLink />,
            hint: account.client.host,
            href: account.client.href,
            external: true,
          },
          // no way to reach Ýeral set: no row (a submenu with no links would open empty)
          ...(contact.links.length ? [{ id: 'contact', label: contact.title, icon: <Headset />, links: contact.links }] : []),
          { id: 'logout', label: t('account.logout'), icon: <LogOut />, danger: true, onSelect: account.logout },
        ]}
        className={collapsed ? undefined : 'self-stretch'}
      />
    </aside>
  )
}

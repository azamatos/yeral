import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, Navigate, Outlet } from '@tanstack/react-router'
import { AccountMenu } from '@yeral/ui/account-menu'
import { cn } from '@yeral/ui/cn'
import { SideNav, SideNavDivider, SideNavItem } from '@yeral/ui/side-nav'
import { KeyRound, LogOut, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { SECTIONS, SECTION_ICONS } from '../model/sections'
import { PasswordModal, RecoveryModal } from './account-modals'

/** Where toasts start beside the sidebar (272) and the rail (96), as the business app's shell has them. */
const TOASTS = `:root { --toast-left: 84px; --toast-bottom: 24px }
@media (min-width: 1024px) { :root { --toast-left: 272px } }`

/**
 * Every section sits in this shell: the 248 sidebar from 1024, the 72 rail under it, down to a phone: a desk tool, so
 * it has no tab bar of its own. A session that ended goes back to the sign-in.
 */
export function TeamShell() {
  const sdk = useSdk()
  const me = useQuery(sdk.admin.me())
  const [modal, setModal] = useState<'password' | 'recovery' | null>(null)

  if (me.data === null) return <Navigate to="/login" replace />
  // the api is down or not set up (`admin_unavailable`): the root's error page, not a blank one
  if (me.isError) throw me.error
  if (!me.data) return null
  const open = (which: 'password' | 'recovery') => setModal(which)
  return (
    <div className="flex min-h-dvh bg-n-0">
      <style>{TOASTS}</style>
      <Sidebar name={me.data.name} login={me.data.login} onOpen={open} />
      <Sidebar collapsed name={me.data.name} login={me.data.login} onOpen={open} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
      <PasswordModal open={modal === 'password'} onOpenChange={(next) => setModal(next ? 'password' : null)} />
      <RecoveryModal
        open={modal === 'recovery'}
        onOpenChange={(next) => setModal(next ? 'recovery' : null)}
        left={me.data.recoveryCodesLeft}
      />
    </div>
  )
}

function Sidebar({
  collapsed = false,
  name,
  login,
  onOpen,
}: {
  collapsed?: boolean
  name: string
  login: string
  onOpen: (which: 'password' | 'recovery') => void
}) {
  const t = useTranslations('shell')
  const sdk = useSdk()
  const signOut = useMutation(sdk.admin.signOut())
  // what's waiting for the team, the same answers the sections show
  const waiting = {
    businesses: useQuery(sdk.admin.businesses({ view: 'review' })).data?.items.length ?? 0,
    reviews: useQuery(sdk.admin.reviews('reported')).data?.items.length ?? 0,
    team: 0,
  }
  return (
    <aside
      className={cn(
        'sticky top-0 h-dvh flex-none flex-col overflow-y-auto border-r border-n-200 bg-n-0',
        collapsed ? 'flex w-18 items-center gap-1.5 py-3 md:hidden' : 'hidden w-62 gap-0.5 p-3 md:flex',
      )}
    >
      <SideNav aria-label={t('menu')} collapsed={collapsed}>
        {SECTIONS.map((section) => {
          const Icon = SECTION_ICONS[section]
          const count = waiting[section]
          return (
            <SideNavItem
              key={section}
              asChild
              icon={<Icon />}
              label={t(`sections.${section}`)}
              count={count > 0 ? { count, tone: 'attention', label: t('waiting', { count }) } : null}
            >
              <Link to={`/${section}`} />
            </SideNavItem>
          )
        })}
      </SideNav>
      <div className="flex-1" />
      {!collapsed && <SideNavDivider />}
      <AccountMenu
        variant={collapsed ? 'rail' : 'block'}
        name={name}
        phone={login}
        menuLabel={t('account.menu')}
        triggerLabel={collapsed ? t('account.triggerOf', { name }) : t('account.trigger')}
        items={[
          { id: 'password', label: t('account.password'), icon: <KeyRound />, onSelect: () => onOpen('password'), opensDialog: true },
          { id: 'recovery', label: t('account.recovery'), icon: <ShieldCheck />, onSelect: () => onOpen('recovery'), opensDialog: true },
          { id: 'logout', label: t('account.logout'), icon: <LogOut />, danger: true, onSelect: () => signOut.mutate() },
        ]}
        className={collapsed ? undefined : 'self-stretch'}
      />
    </aside>
  )
}

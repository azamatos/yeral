import { useMutation } from '@tanstack/react-query'
import { Navigate, Outlet } from '@tanstack/react-router'
import { TAB_BAR_HEIGHT } from '@yeral/ui/bottom-tab-bar'
import { useEffect, useState, type CSSProperties } from 'react'
import { useSdk } from '@/shared/api'
import { useWorkspace } from '../model/use-workspace'
import { ProfileDrawer } from './profile-drawer'
import { ShellSidebar } from './shell-sidebar'
import { ShellTabBar } from './shell-tab-bar'

/**
 * Where toasts start while the shell is on screen (DS-Patterns Toast · ShellOffset): 24 beside the 248 sidebar (272),
 * 24 beside the 72 rail (96), and on phones 12 from the sides and 12 above the tab bar.
 */
// the breakpoints are the theme's `sm` and `md` (a media query can't read them)
const TOASTS = `:root { --toast-left: 12px; --toast-bottom: calc(${TAB_BAR_HEIGHT} + 12px) }
@media (min-width: 768px) { :root { --toast-left: 96px; --toast-bottom: 24px } }
@media (min-width: 1024px) { :root { --toast-left: 272px } }`

/**
 * Every workspace page sits in this shell (B-Shell, B-Mobile): the 248 sidebar from 1024, the 72 rail from 768, the tab
 * bar with More under 768 (by width alone: one shell, three ways to show it). The workspace on screen becomes the last
 * used, so the next sign-in opens it (book B-07). A session that ended, or a workspace the person isn't on any more,
 * goes back to the sign-in, which knows where they belong.
 */
export function WorkspaceShell() {
  const sdk = useSdk()
  const { slug, me, workspaces, workspace } = useWorkspace()
  const { mutate: markOpened } = useMutation(sdk.team.open())
  const current = workspaces?.current
  const member = !!workspace
  const [profile, setProfile] = useState(false)

  useEffect(() => {
    if (member && current !== slug) markOpened(slug)
  }, [member, current, slug, markOpened])

  if (me === null) return <Navigate to="/login" replace />
  // not on this team any more (left from My profile, removed): the last used other workspace, else the sign-in
  if (workspaces && !workspace) {
    const next = workspaces.items.find((w) => w.slug === workspaces.current) ?? workspaces.items[0]
    return next ? <Navigate to="/w/$slug/calendar" params={{ slug: next.slug }} replace /> : <Navigate to="/login" replace />
  }
  return (
    <div className="flex min-h-dvh bg-n-0">
      <style>{TOASTS}</style>
      <ShellSidebar onProfile={() => setProfile(true)} />
      <ShellSidebar collapsed onProfile={() => setProfile(true)} />
      {/* under 768 the tab bar is fixed at the bottom: the page keeps clear of it */}
      <div className="flex min-w-0 flex-1 flex-col pb-(--tab-bar) sm:pb-0" style={{ '--tab-bar': TAB_BAR_HEIGHT } as CSSProperties}>
        <Outlet />
      </div>
      <ShellTabBar onProfile={() => setProfile(true)} />
      <ProfileDrawer open={profile} onOpenChange={setProfile} />
    </div>
  )
}

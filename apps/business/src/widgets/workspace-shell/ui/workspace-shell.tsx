import { useMutation } from '@tanstack/react-query'
import { Navigate, Outlet, useLocation } from '@tanstack/react-router'
import { TAB_BAR_HEIGHT } from '@yeral/ui/bottom-tab-bar'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useSdk } from '@/shared/api'
import { placeFor, targetRoute } from '../model/sections'
import { useWorkspace } from '../model/use-workspace'
import { ProfileDrawer } from './profile-drawer'
import { RequestArrivals } from './request-arrivals'
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
 * used, so the next sign-in opens it (book B-07). A session that ended goes back to the sign-in; a workspace the person
 * isn't on any more (left from My profile, removed) goes where its address would (`placeFor`: the last used other
 * workspace, the same section where their level has it, else the sign-in, which says they have none).
 */
export function WorkspaceShell() {
  const sdk = useSdk()
  const { slug, me, workspaces, workspace } = useWorkspace()
  const { mutate: markOpened } = useMutation(sdk.team.open())
  const current = workspaces?.current
  const member = !!workspace
  const pathname = useLocation({ select: (l) => l.pathname })
  const [profile, setProfile] = useState(false)
  // what opened My profile gets the focus back when it closes (the account menu's button, More)
  const opener = useRef<HTMLElement | null>(null)
  const openProfile = (from: HTMLElement | null) => {
    opener.current = from
    setProfile(true)
  }

  useEffect(() => {
    if (member && current !== slug) markOpened(slug)
  }, [member, current, slug, markOpened])

  if (me === null) return <Navigate to="/login" replace />
  // not on this team any more (left from My profile, removed): where the address goes now, without "closed" (they left)
  if (workspaces && !workspace) {
    const place = placeFor(pathname, slug, workspaces)
    return 'to' in place ? (
      <Navigate to={targetRoute(place.to)} params={{ slug: place.to.slug }} replace />
    ) : (
      <Navigate to="/login" replace />
    )
  }
  return (
    <div className="flex min-h-dvh bg-n-0">
      <style>{TOASTS}</style>
      <ShellSidebar onProfile={openProfile} />
      <ShellSidebar collapsed onProfile={openProfile} />
      {/* under 768 the tab bar is fixed at the bottom: the page keeps clear of it; a page as tall as the screen (the
          calendar's, `flush`) gets exactly its height */}
      <div
        className="flex min-w-0 flex-1 flex-col pb-(--tab-bar) sm:pb-0 [&:has(>main[data-fill])]:h-dvh"
        style={{ '--tab-bar': TAB_BAR_HEIGHT } as CSSProperties}
      >
        <Outlet />
      </div>
      <ShellTabBar onProfile={openProfile} />
      {member && <RequestArrivals key={slug} slug={slug} />}
      <ProfileDrawer open={profile} onOpenChange={setProfile} opener={opener} />
    </div>
  )
}

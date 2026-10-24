import { useLocation } from '@tanstack/react-router'
import { AppTopBar } from '@yeral/ui/app-top-bar'
import type { ReactNode } from 'react'
import { usePageTitle } from '@/shared/lib'
import { useWorkspace } from '../model/use-workspace'
import { InviteNote } from './invite-note'
import { ShellSwitcher } from './shell-switcher'

/**
 * A workspace page's frame (B-Shell): the top bar (its title and one primary action; on the phone's calendar the
 * workspace switcher strip, `switcherOnPhone`), the notes at the top of the content, and the content padded 32 (24 on a
 * tablet, 16 on a phone). The tab title is "Calendar · Glow Studio"; `tabTitle` names a part of the page there instead
 * ("Hours · Settings · Glow Studio").
 */
export function WorkspacePage({
  title,
  tabTitle,
  actions,
  switcherOnPhone = false,
  children,
}: {
  title: string
  tabTitle?: string
  actions?: ReactNode
  switcherOnPhone?: boolean
  children?: ReactNode
}) {
  const { workspace } = useWorkspace()
  // a new page (a menu item, another workspace): its title takes the focus, as the sign-in's steps do
  const pathname = useLocation({ select: (l) => l.pathname })
  usePageTitle(tabTitle ?? title, workspace?.name)
  return (
    <>
      <AppTopBar
        title={title}
        actions={actions}
        focusKey={pathname}
        leading={switcherOnPhone ? <ShellSwitcher variant="strip" /> : undefined}
      />
      <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6 md:p-8">
        <InviteNote />
        {children}
      </main>
    </>
  )
}

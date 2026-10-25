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
 * (["Hours", "Settings"] → "Hours · Settings · Glow Studio"). The title takes the focus when the address changes, or
 * when `focusKey` does: a page whose parts take the focus themselves (Settings' sections) gives one that stays.
 * `flush`: the content edge to edge and as tall as the screen (the calendar's toolbar and grid draw their own padding
 * and lines, and the grid scrolls inside it).
 */
export function WorkspacePage({
  title,
  tabTitle,
  focusKey,
  actions,
  switcherOnPhone = false,
  flush = false,
  children,
}: {
  title: string
  tabTitle?: string[]
  focusKey?: string
  actions?: ReactNode
  switcherOnPhone?: boolean
  flush?: boolean
  children?: ReactNode
}) {
  const { workspace } = useWorkspace()
  // a new page (a menu item, another workspace): its title takes the focus, as the sign-in's steps do
  const pathname = useLocation({ select: (l) => l.pathname })
  usePageTitle(...(tabTitle ?? [title]), workspace?.name)
  return (
    <>
      <AppTopBar
        title={title}
        actions={actions}
        focusKey={focusKey ?? pathname}
        leading={switcherOnPhone ? <ShellSwitcher variant="strip" /> : undefined}
      />
      {flush ? (
        <main data-fill className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="flex-none px-4 pt-4 empty:hidden sm:px-6 sm:pt-6 md:px-8 md:pt-8">
            <InviteNote />
          </div>
          {children}
        </main>
      ) : (
        <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6 md:p-8">
          <InviteNote />
          {children}
        </main>
      )}
    </>
  )
}

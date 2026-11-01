import { useLocation } from '@tanstack/react-router'
import { AppTopBar } from '@yeral/ui/app-top-bar'
import type { ReactNode } from 'react'
import { usePageTitle } from '@/shared/lib'

/**
 * A section's frame, the business app's WorkspacePage: the top bar with its title and one primary action, the content
 * padded 32 (24 on a tablet, 16 on a phone). The title takes the focus when the address changes.
 */
export function TeamPage({
  title,
  back,
  actions,
  children,
}: {
  title: string
  back?: ReactNode
  actions?: ReactNode
  children?: ReactNode
}) {
  const pathname = useLocation({ select: (l) => l.pathname })
  usePageTitle(title)
  return (
    <>
      <AppTopBar title={title} back={back} actions={actions} focusKey={pathname} />
      <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6 md:p-8">{children}</main>
    </>
  )
}

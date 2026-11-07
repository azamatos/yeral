import type { ReactNode } from 'react'
import { SiteFooter } from './site-footer'
import { SiteHeader, type SiteHeaderProps } from './site-header'

/**
 * A page of the site with its chrome (Home, Account-Profile, States 09: the marketing header and the footer). The
 * search pages and the business page put the compact SearchBar in the header (`search`, `phoneSearch`, `wide`);
 * booking flows get the focused header and no footer (slice 3).
 */
export function SiteLayout({ children, ...header }: SiteHeaderProps & { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-n-0 text-n-900">
      <SiteHeader {...header} />
      <main className="flex flex-1 flex-col">{children}</main>
      <SiteFooter />
    </div>
  )
}

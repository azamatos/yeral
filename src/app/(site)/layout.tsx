import type { ReactNode } from 'react'
import { SiteFooter } from '@/components/site/footer'
import { SiteHeader } from '@/components/site/header'
import { MobileTabs } from '@/components/site/mobile-tabs'

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="min-h-[60dvh]">{children}</main>
      <SiteFooter />
      <MobileTabs />
    </>
  )
}

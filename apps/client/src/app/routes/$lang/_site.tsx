import { createFileRoute, Outlet } from '@tanstack/react-router'
import { SiteLayout } from '@/widgets/site-layout'

// the pages with the site's header and footer; booking flows (P4 slice 3) sit outside, with their focused header
export const Route = createFileRoute('/$lang/_site')({
  component: () => (
    <SiteLayout>
      <Outlet />
    </SiteLayout>
  ),
})

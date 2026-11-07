import { createFileRoute, Outlet, useMatches } from '@tanstack/react-router'
import { HeaderSearch, HeaderSearchPhone } from '@/widgets/search-bar'
import { SiteLayout } from '@/widgets/site-layout'

// the pages with the site's header and footer; booking flows (P4 slice 3) sit outside, with their focused header
export const Route = createFileRoute('/$lang/_site')({
  component: Site,
})

function Site() {
  // the search pages and the business page carry the compact SearchBar in the header (`staticData.searchHeader`)
  const mode = useMatches()
    .map((m) => m.staticData.searchHeader)
    .find(Boolean)
  return (
    <SiteLayout
      search={mode && <HeaderSearch mode={mode} />}
      phoneSearch={mode === 'results' && <HeaderSearchPhone />}
      wide={mode === 'results'}
    >
      <Outlet />
    </SiteLayout>
  )
}

import { RouterProvider } from '@tanstack/react-router'
import { brand } from '@yeral/ui/brand'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { startEvents } from '@yeral/sdk'
import { createApi } from '@/shared/api'
import { site } from '@/shared/config'
import { appLocale } from '@/shared/i18n'
import { AppProviders } from './app-providers'
import { createAppRouter } from './router'
import '../styles.css'

const api = createApi({ baseUrl: site.urls.api })
const router = createAppRouter(api)
// live updates while someone is signed in: requests, the team, counts (systemPatterns "Data flow")
startEvents(api.client, api.queryClient)

// the tab and home-screen icons are the brand's (a rebrand replaces the files in @yeral/ui/brand, nothing here)
for (const [rel, href] of [
  ['icon', brand.tabIcon],
  ['apple-touch-icon', brand.touchIcon],
] as const) {
  const link = document.createElement('link')
  link.rel = rel
  link.href = href
  document.head.append(link)
}

const root = document.getElementById('root')
if (!root) throw new Error('index.html has no #root')

createRoot(root).render(
  <StrictMode>
    {/* the market's main language until a signed-in person's own language is known */}
    <AppProviders api={api} locale={appLocale()}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)

import { RouterProvider } from '@tanstack/react-router'
import { brand } from '@yeral/ui/brand'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createApi } from '@/shared/api'
import { site } from '@/shared/config'
import { AppProviders } from './app-providers'
import { createAppRouter } from './router'
import '../styles.css'

const api = createApi({ baseUrl: site.urls.api })
const router = createAppRouter(api)

// the tab's icon is the brand's (a rebrand replaces the file in @yeral/ui/brand, nothing here)
const icon = document.createElement('link')
icon.rel = 'icon'
icon.href = brand.tabIcon
document.head.append(icon)

const root = document.getElementById('root')
if (!root) throw new Error('index.html has no #root')

createRoot(root).render(
  <StrictMode>
    <AppProviders api={api}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)

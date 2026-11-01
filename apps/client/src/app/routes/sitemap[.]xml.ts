import { createFileRoute } from '@tanstack/react-router'
import { createApi } from '@yeral/sdk'
import { apiUrl, site } from '@/shared/config'
import { SITE_LOCALES } from '@/shared/i18n'
import { sitemapXml } from '@/shared/lib'

/** How long search engines and the edge may keep the sitemap. */
const MAX_AGE_S = 3600

// The sitemap (book F-197): the api says which pages are public.
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        const { sdk, queryClient } = createApi({ baseUrl: apiUrl() })
        const data = await queryClient.fetchQuery(sdk.catalog.sitemap())
        return new Response(sitemapXml(site.urls.client, SITE_LOCALES, data), {
          headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': `public, max-age=${MAX_AGE_S}` },
        })
      },
    },
  },
})

import { createFileRoute } from '@tanstack/react-router'
import { site } from '@/shared/config'
import { robotsTxt } from '@/shared/lib'

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: () => new Response(robotsTxt(site.urls.client), { headers: { 'content-type': 'text/plain; charset=utf-8' } }),
    },
  },
})

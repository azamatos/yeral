import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '@/pages/home'
import { siteLocale } from '@/shared/i18n'
import { pageHead } from '@/shared/lib'

// The login's own address (client spec §3: the login opens as a modal over the page; the address is the fallback),
// rendered in the browser only (systemPatterns "Rendering"). The modal comes with the next part (book C-19); until then
// the address opens Home.
export const Route = createFileRoute('/$lang/_site/login')({
  ssr: false,
  head: ({ params }) => pageHead(siteLocale(params.lang), { path: '/login', title: (t) => t('site.logIn'), noindex: true }),
  component: HomePage,
})

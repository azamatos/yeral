import { createFileRoute, redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { LoginPage, returnTo } from '@/pages/login'
import { siteLocale } from '@/shared/i18n'
import { pageHead } from '@/shared/lib'

// The login's own address, rendered in the browser only (systemPatterns "Rendering"); someone already signed in with a
// name goes straight on.
export const Route = createFileRoute('/$lang/_site/login')({
  ssr: false,
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: async ({ context, params, search }) => {
    const me = await context.queryClient.ensureQueryData(context.sdk.me.get()).catch(() => null)
    if (me?.firstName) redirect({ href: returnTo(params.lang, search.redirect), replace: true, throw: true })
  },
  head: ({ params }) => pageHead(siteLocale(params.lang), { path: '/login', title: (t) => t('site.logIn'), noindex: true }),
  component: LoginPage,
})

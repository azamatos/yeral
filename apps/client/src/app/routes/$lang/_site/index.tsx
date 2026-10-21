import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '@/pages/home'
import { siteLocale } from '@/shared/i18n'
import { pageHead } from '@/shared/lib'

export const Route = createFileRoute('/$lang/_site/')({
  head: ({ params }) => pageHead(siteLocale(params.lang), { path: '', description: (t) => t('site.tagline') }),
  component: HomePage,
})

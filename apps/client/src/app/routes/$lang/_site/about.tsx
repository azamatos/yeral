import { createFileRoute } from '@tanstack/react-router'
import { StaticPage } from '@/pages/static'
import { siteLocale } from '@/shared/i18n'
import { pageHead } from '@/shared/lib'

export const Route = createFileRoute('/$lang/_site/about')({
  head: ({ params }) =>
    pageHead(siteLocale(params.lang), {
      path: '/about',
      title: (t) => t('pages.about.title', { brand: t('common.brand') }),
      description: (t) => t('pages.about.description', { brand: t('common.brand') }),
    }),
  component: () => <StaticPage page="about" />,
})

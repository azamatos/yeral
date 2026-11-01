import { createFileRoute } from '@tanstack/react-router'
import { StaticPage } from '@/pages/static'
import { siteLocale } from '@/shared/i18n'
import { pageHead } from '@/shared/lib'

export const Route = createFileRoute('/$lang/_site/terms')({
  head: ({ params }) =>
    pageHead(siteLocale(params.lang), {
      path: '/terms',
      title: (t) => t('pages.terms.title', { brand: t('common.brand') }),
      description: (t) => t('pages.terms.description', { brand: t('common.brand') }),
    }),
  component: () => <StaticPage page="terms" />,
})

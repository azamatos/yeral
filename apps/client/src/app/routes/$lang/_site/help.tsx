import { createFileRoute } from '@tanstack/react-router'
import { StaticPage } from '@/pages/static'
import { siteLocale } from '@/shared/i18n'
import { pageHead } from '@/shared/lib'

export const Route = createFileRoute('/$lang/_site/help')({
  head: ({ params }) =>
    pageHead(siteLocale(params.lang), {
      path: '/help',
      title: (t) => t('pages.help.title', { brand: t('common.brand') }),
      description: (t) => t('pages.help.description', { brand: t('common.brand') }),
    }),
  component: () => <StaticPage page="help" />,
})

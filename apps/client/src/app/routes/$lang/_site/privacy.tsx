import { createFileRoute } from '@tanstack/react-router'
import { StaticPage } from '@/pages/static'
import { siteLocale } from '@/shared/i18n'
import { pageHead } from '@/shared/lib'

export const Route = createFileRoute('/$lang/_site/privacy')({
  head: ({ params }) =>
    pageHead(siteLocale(params.lang), {
      path: '/privacy',
      title: (t) => t('pages.privacy.title', { brand: t('common.brand') }),
      description: (t) => t('pages.privacy.description', { brand: t('common.brand') }),
    }),
  component: () => <StaticPage page="privacy" />,
})

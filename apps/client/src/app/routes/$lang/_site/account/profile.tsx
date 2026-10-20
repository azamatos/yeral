import { createFileRoute } from '@tanstack/react-router'
import { AccountProfilePage } from '@/pages/account-profile'
import { siteLocale } from '@/shared/i18n'
import { pageHead } from '@/shared/lib'

export const Route = createFileRoute('/$lang/_site/account/profile')({
  head: ({ params }) => pageHead(siteLocale(params.lang), { path: '/account/profile', title: (t) => t('profile.title'), noindex: true }),
  component: AccountProfilePage,
})

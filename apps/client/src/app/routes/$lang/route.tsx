import { createFileRoute, notFound } from '@tanstack/react-router'
import { isSiteLocale } from '@/shared/i18n'

// every page's address starts with one of the site's languages (`/en/…`); any other first segment is not a page
export const Route = createFileRoute('/$lang')({
  beforeLoad: ({ params }) => {
    if (!isSiteLocale(params.lang)) notFound({ throw: true })
  },
})

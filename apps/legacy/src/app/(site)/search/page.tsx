import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'
import type { CategoryId } from '@/api'
import { CATEGORY_ORDER } from '@/components/site/category-icon'
import { SearchView } from '@/components/search/search-view'

export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }): Promise<Metadata> {
  const sp = await searchParams
  const t = await getTranslations()
  const cat = CATEGORY_ORDER.includes(sp.category as CategoryId) ? (sp.category as CategoryId) : null
  return { title: cat ? t('meta.searchCategoryTitle', { category: t(`categories.${cat}`) }) : t('meta.searchTitle') }
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchView />
    </Suspense>
  )
}

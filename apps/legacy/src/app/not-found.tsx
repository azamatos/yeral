import { SearchX } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { SiteFooter } from '@/components/site/footer'
import { SiteHeader } from '@/components/site/header'
import { Empty } from '@/components/ui/bits'
import { ButtonLink } from '@/components/ui/button'

export default async function NotFound() {
  const t = await getTranslations('errors')
  return (
    <>
      <SiteHeader />
      <main className="min-h-[60dvh] py-10">
        <Empty icon={<SearchX size={28} />} title={t('notFoundTitle')} text={t('notFoundText')}>
          <ButtonLink href="/">{t('toHome')}</ButtonLink>
        </Empty>
      </main>
      <SiteFooter />
    </>
  )
}

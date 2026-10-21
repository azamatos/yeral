import { useTranslations } from 'use-intl'
import { wrap } from '@/shared/ui'

/**
 * Stands in for Home (`/{lang}`, P4 slice 5: the hero search, categories, places near you) so the site has a first page
 * under its chrome. Nothing from the Home board is drawn here until that slice builds it.
 */
export function HomePage() {
  const t = useTranslations()
  return (
    <section className={`${wrap} flex flex-col gap-4 pt-14 pb-22 max-sm:pt-6 max-sm:pb-14`}>
      <h1 className="m-0 text-h1">{t('common.brand')}</h1>
      <p className="m-0 max-w-[560px] text-body-l text-n-600">{t('home.lead')}</p>
    </section>
  )
}

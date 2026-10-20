import { Logo } from '@yeral/ui/brand'
import { useTranslations } from 'use-intl'
import { usePageTitle } from '@/shared/lib'

/** A placeholder at `/` until the sign-in (P4 slice 1) and the landing come. */
export function HomePage() {
  const t = useTranslations()
  const brand = t('common.brand')
  usePageTitle()
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <Logo alt={brand} height={30} />
      <div className="flex max-w-110 flex-col gap-2">
        <h1 className="text-[26px] leading-8 font-bold tracking-[-0.02em] text-balance max-sm:text-[24px] max-sm:leading-[30px]">
          {t('home.title')}
        </h1>
        <p className="text-body text-n-600">{t('home.lead')}</p>
      </div>
    </main>
  )
}

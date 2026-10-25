import { useSuspenseQuery } from '@tanstack/react-query'
import { Link, useParams } from '@tanstack/react-router'
import { useSdk } from '@yeral/sdk/react'
import { ArrowLeft } from 'lucide-react'
import { useLocale, useTranslations } from 'use-intl'
import { wrap } from '@/shared/ui'

/**
 * Stands in for the booking flow (`/{lang}/b/{slug}/book`, Booking, book C-12–C-22) until P4 slice 3 builds its steps,
 * so the business page's «Book» and «Continue» lead somewhere: the business's name and the way back to its page.
 */
export function BookingPage() {
  const t = useTranslations('business.booking')
  const { slug = '' } = useParams({ strict: false })
  const lang = useLocale()
  const sdk = useSdk()
  const { data: detail } = useSuspenseQuery(sdk.catalog.business(slug, lang))
  return (
    <section className={`${wrap} flex flex-col gap-4 pt-14 pb-22 max-sm:pt-6 max-sm:pb-14`}>
      <Link
        to="/$lang/b/$slug"
        params={{ lang, slug: detail.slug }}
        className="inline-flex items-center gap-1.5 self-start text-small font-semibold text-a-600 no-underline hover:text-a-700"
      >
        <ArrowLeft aria-hidden className="size-4" strokeWidth={1.75} />
        {t('back', { name: detail.name })}
      </Link>
      <h1 className="m-0 text-h1">{t('title')}</h1>
      <p className="m-0 max-w-[560px] text-body-l text-n-600">{t('lead')}</p>
    </section>
  )
}

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'
import { api } from '@/api'
import { BookingFlow, Fallback } from '@/components/booking/booking-flow'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const s = await api.catalog.salon(slug)
  const t = await getTranslations('salon')
  return { title: s ? `${t('book')} · ${s.name}` : undefined, robots: { index: false } }
}

/** Full-page booking: no site header/footer, nothing to distract from the steps (Fresha pattern). */
export default async function BookPage({ params }: Props) {
  const { slug } = await params
  const s = await api.catalog.salon(slug)
  if (!s) notFound()
  return (
    <Suspense fallback={<Fallback />}>
      <BookingFlow s={s} />
    </Suspense>
  )
}

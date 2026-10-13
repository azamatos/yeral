'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Suspense } from 'react'
import { PhoneAuth } from '@/components/auth/phone-auth'

function Login() {
  const t = useTranslations('auth')
  const router = useRouter()
  const sp = useSearchParams()
  const next = sp.get('next') || '/account/bookings'
  return (
    <div className="mx-auto max-w-[440px] px-4 py-12 md:py-20">
      <img src="/img/yeral-mark.png" alt="" className="h-12 w-auto" />
      <h1 className="mt-6 text-[30px] font-bold tracking-[-0.03em]">{t('title')}</h1>
      <p className="mb-6 mt-1 text-[15px] text-ink-2">{t('subtitle')}</p>
      <PhoneAuth onDone={() => router.replace(next.startsWith('/') ? next : '/')} />
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <Login />
    </Suspense>
  )
}

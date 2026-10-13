'use client'

import { CalendarDays, House, Search, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useMyBookings, useSession } from '@/api/hooks'
import { cls } from '@/domain/time'

/** Phone bottom bar — the same three-tab shape as the mobile app (Поиск / Записи / Профиль) plus Главная. */
export function MobileTabs() {
  const t = useTranslations('header')
  const path = usePathname()
  const { data: session } = useSession()
  const { data: bookings = [] } = useMyBookings(!!session)
  const attention = bookings.filter((b) => (b.proposal && b.view === 'confirmed') || (b.needsClientConfirm && !b.clientConfirmed && b.view === 'confirmed')).length
  const tabs = [
    { href: '/', label: t('home'), icon: House, on: path === '/' },
    { href: '/search', label: t('search'), icon: Search, on: path.startsWith('/search') },
    { href: session ? '/account/bookings' : '/login?next=/account/bookings', label: t('bookings'), icon: CalendarDays, on: path.startsWith('/account/bookings'), badge: attention },
    { href: session ? '/account/profile' : '/login?next=/account/profile', label: t('profile'), icon: User, on: path.startsWith('/account') && !path.startsWith('/account/bookings') },
  ]
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      {tabs.map(({ href, label, icon: I, on, badge }) => (
        <Link key={label} href={href} className={cls('relative flex h-[54px] flex-1 flex-col items-center justify-center gap-[3px] text-[11px]', on ? 'font-semibold text-acc' : 'font-medium text-ink-2')}>
          <I size={23} strokeWidth={1.75} />
          {label}
          {!!badge && <span className="absolute left-1/2 top-1.5 ml-2 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-amber px-1 text-[10px] font-bold text-white">{badge}</span>}
        </Link>
      ))}
    </nav>
  )
}

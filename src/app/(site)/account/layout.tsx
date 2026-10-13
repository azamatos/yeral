'use client'

import { CalendarDays, Heart, MessageSquareText, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, type ReactNode } from 'react'
import { useSession } from '@/api/hooks'
import { cls } from '@/domain/time'
import { Skeleton } from '@/components/ui/bits'

/** Account pages need a session; the side menu mirrors the app's profile screen. */
export default function AccountLayout({ children }: { children: ReactNode }) {
  const t = useTranslations('header')
  const path = usePathname()
  const router = useRouter()
  const { data: session, isPending } = useSession()
  useEffect(() => {
    if (!isPending && !session) router.replace(`/login?next=${encodeURIComponent(path)}`)
  }, [isPending, session, path, router])
  const items = [
    { href: '/account/bookings', label: t('myBookings'), icon: CalendarDays },
    { href: '/account/favorites', label: t('favorites'), icon: Heart },
    { href: '/account/reviews', label: t('reviews'), icon: MessageSquareText },
    { href: '/account/profile', label: t('profile'), icon: User },
  ]
  return (
    <div className="mx-auto grid max-w-[1240px] gap-8 px-4 pb-24 pt-6 md:grid-cols-[220px_1fr] md:px-6 md:pt-10">
      <nav className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 md:mx-0 md:flex-col md:px-0">
        {items.map(({ href, label, icon: I }) => {
          const on = path.startsWith(href)
          return (
            <Link key={href} href={href} className={cls('flex h-10 flex-none items-center gap-3 rounded-xl px-3 text-[15px]', on ? 'bg-acc-tint font-semibold text-acc-ink' : 'font-medium text-ink-2 hover:bg-group hover:text-ink')}>
              <I size={19} strokeWidth={1.75} />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="min-w-0">{session ? children : <Skeleton className="h-10 w-64" />}</div>
    </div>
  )
}

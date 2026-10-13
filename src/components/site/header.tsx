'use client'

import { Bell, CalendarDays, Heart, LogOut, MessageSquareText, Search, Store, User } from 'lucide-react'
import { DropdownMenu, Popover } from 'radix-ui'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuthActions, useMarkRead, useNotifications, useSession } from '@/api/hooks'
import { cls } from '@/domain/time'
import { Avatar } from '@/components/ui/bits'
import { buttonClass } from '@/components/ui/button'
import { Logo } from './logo'
import { CompactSearch } from './search-bar'

function Notifications() {
  const t = useTranslations('header')
  const router = useRouter()
  const { data = [] } = useNotifications()
  const markRead = useMarkRead()
  const unread = data.filter((n) => !n.read).length
  return (
    <Popover.Root>
      <Popover.Trigger className="relative flex size-10 items-center justify-center rounded-full hover:bg-group" aria-label={t('notifications')}>
        <Bell size={21} strokeWidth={1.75} />
        {unread > 0 && <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full border-2 border-white bg-amber px-1 text-[10px] font-bold text-white">{unread}</span>}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" sideOffset={8} className="z-40 w-[min(380px,calc(100vw-24px))] animate-pop-in overflow-hidden rounded-[18px] border border-line bg-white shadow-pop">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="font-semibold">{t('notifications')}</div>
            {unread > 0 && (
              <button className="text-[13px] font-semibold text-acc-ink" onClick={() => markRead()}>
                {t('markAllRead')}
              </button>
            )}
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {!data.length && <div className="px-6 py-10 text-center text-[14px] text-ink-2">{t('noNotifications')}</div>}
            {data.map((n) => (
              <Popover.Close asChild key={n.id}>
                <button
                  className="flex w-full gap-3 border-b border-row px-4 py-3 text-left last:border-0 hover:bg-group-2"
                  onClick={() => {
                    markRead(n.id)
                    if (n.bookingId) router.push(`/account/bookings/${n.bookingId}`)
                  }}
                >
                  <span className={cls('mt-1.5 size-2 flex-none rounded-full', n.read ? 'bg-transparent' : 'bg-acc')} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-semibold">{n.title}</span>
                    <span className="mt-0.5 block text-[13.5px] leading-snug text-ink-2">{n.body}</span>
                    <span className="mt-1 block text-[12px] text-ink-3">{new Date(n.ts).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</span>
                  </span>
                </button>
              </Popover.Close>
            ))}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function UserMenu({ name }: { name: string }) {
  const t = useTranslations('header')
  const router = useRouter()
  const { logout } = useAuthActions()
  const item = 'flex h-10 cursor-pointer items-center gap-3 rounded-[10px] px-3 text-[15px] outline-none data-[highlighted]:bg-group'
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 hover:bg-group-2" aria-label={t('profile')}>
        <Avatar name={name} size={32} acc />
        <span className="hidden max-w-[120px] truncate text-[14px] font-semibold lg:block">{name.split(' ')[0]}</span>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={8} className="z-40 w-60 animate-pop-in rounded-[16px] border border-line bg-white p-1.5 shadow-pop">
          <DropdownMenu.Item className={item} onSelect={() => router.push('/account/bookings')}><CalendarDays size={18} strokeWidth={1.75} />{t('myBookings')}</DropdownMenu.Item>
          <DropdownMenu.Item className={item} onSelect={() => router.push('/account/favorites')}><Heart size={18} strokeWidth={1.75} />{t('favorites')}</DropdownMenu.Item>
          <DropdownMenu.Item className={item} onSelect={() => router.push('/account/reviews')}><MessageSquareText size={18} strokeWidth={1.75} />{t('reviews')}</DropdownMenu.Item>
          <DropdownMenu.Item className={item} onSelect={() => router.push('/account/profile')}><User size={18} strokeWidth={1.75} />{t('profile')}</DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item className={item} onSelect={() => router.push('/for-business')}><Store size={18} strokeWidth={1.75} />{t('forBusiness')}</DropdownMenu.Item>
          <DropdownMenu.Item className={cls(item, 'text-red-ink')} onSelect={async () => { await logout(); router.push('/') }}><LogOut size={18} strokeWidth={1.75} />{t('logout')}</DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

export function SiteHeader({ search = true, wide }: { search?: boolean; wide?: boolean }) {
  const t = useTranslations('header')
  const pathname = usePathname()
  const { data: session, isPending } = useSession()
  wide = wide || pathname.startsWith('/search')
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur-md">
      <div className={cls('mx-auto flex h-16 items-center gap-4 px-4 md:h-[72px] md:px-6', wide ? 'max-w-none lg:px-8' : 'max-w-[1240px]')}>
        <Logo className="h-7 md:h-8" />
        {search && pathname !== '/' ? <CompactSearch className="mx-auto hidden w-full max-w-[460px] md:flex" /> : <div className="flex-1" />}
        <div className="ml-auto flex items-center gap-1.5 md:ml-0">
          <Link href="/search" className="flex size-10 items-center justify-center rounded-full hover:bg-group md:hidden" aria-label={t('search')}>
            <Search size={21} strokeWidth={1.75} />
          </Link>
          <Link href="/for-business" className={buttonClass({ variant: 'outline', size: 'sm', pill: true, className: 'hidden lg:inline-flex' })}>
            {t('forBusiness')}
          </Link>
          {isPending ? (
            <span className="size-10" />
          ) : session ? (
            <>
              <Notifications />
              <UserMenu name={session.user.name} />
            </>
          ) : (
            <Link href={`/login?next=${encodeURIComponent(pathname)}`} className={buttonClass({ variant: 'dark', size: 'sm', pill: true })}>
              {t('login')}
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

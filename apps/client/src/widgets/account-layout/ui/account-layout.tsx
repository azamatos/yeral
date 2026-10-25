import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { formatPhone } from '@yeral/domain/phone'
import { useSdk } from '@yeral/sdk/react'
import { cn } from '@yeral/ui/cn'
import { CalendarDays, LogOut, UserRound } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { useLogOut } from '@/features/log-out'
import { PersonMark, wrap } from '@/shared/ui'

/** A place in the account aside (`.sn`): 40 high, 14/500, r10; the current one on tint; pills under 1024. */
const navItem = cn(
  'flex h-10 cursor-pointer items-center gap-3 rounded-s border-0 bg-transparent px-3 text-small font-medium whitespace-nowrap text-n-900 no-underline',
  'hover:bg-group focus-visible:shadow-focus focus-visible:outline-none [&_svg]:size-5 [&_svg]:flex-none',
  'data-[status=active]:bg-a-50 data-[status=active]:font-semibold data-[status=active]:text-a-600',
  'max-md:h-11 max-md:flex-none max-md:gap-2 max-md:rounded-pill max-md:border max-md:border-n-300 max-md:px-4 max-md:data-[status=active]:border-a-line',
)

/**
 * The account area (Account-Profile `.acc`): the client account aside (avatar 56, the name and phone, the account's
 * places: My bookings, Profile and settings; «Log out») beside the page. Under 1024 the aside becomes a row of pills
 * above the page, without the person and «Log out» (they are in the header's menu). Favourites join with their page
 * (slice 5).
 * Nobody signed in any more (logged out here or in the header, the account deleted, the session ended elsewhere): Home.
 */
export function AccountLayout({ children }: { children: ReactNode }) {
  const t = useTranslations('account')
  const lang = useLocale()
  const sdk = useSdk()
  const me = useQuery(sdk.me.get())
  const navigate = useNavigate()
  const { logOut, loggingOut } = useLogOut()
  const signedOut = me.data === null
  useEffect(() => {
    if (signedOut) void navigate({ to: '/$lang', params: { lang }, replace: true })
  }, [signedOut, navigate, lang])
  const name = me.data ? (me.data.name ?? me.data.firstName) : null

  return (
    <div className={wrap}>
      <div className="flex flex-wrap items-start gap-12 pt-10 pb-24 max-md:gap-6 max-md:pt-6">
        <aside aria-label={t('mine')} className="flex max-w-65 min-w-0 flex-[1_1_240px] flex-col gap-5 max-md:max-w-none max-md:basis-full">
          {me.data && (
            <div className="flex items-center gap-3.5 px-3 max-md:hidden">
              <PersonMark firstName={me.data.firstName} size={56} />
              <div className="flex min-w-0 flex-col gap-0.5">
                {name && <span className="text-[16px] leading-[22px] font-semibold break-words">{name}</span>}
                <span className="text-dense text-n-600 tabular-nums">{formatPhone(me.data.phone)}</span>
              </div>
            </div>
          )}
          <nav
            aria-label={t('sections')}
            className="flex flex-col gap-0.5 max-md:-mx-6 max-md:flex-row max-md:gap-2 max-md:overflow-x-auto max-md:px-6 max-md:pb-1 max-sm:-mx-4 max-sm:px-4"
          >
            <Link to="/$lang/account/bookings" params={{ lang }} className={navItem}>
              <CalendarDays aria-hidden />
              {t('bookings')}
            </Link>
            <Link to="/$lang/account/profile" params={{ lang }} className={navItem}>
              <UserRound aria-hidden />
              {t('profileAndSettings')}
            </Link>
            <span aria-hidden className="my-2 h-px bg-n-200 max-md:hidden" />
            <button
              type="button"
              onClick={logOut}
              disabled={loggingOut}
              aria-busy={loggingOut || undefined}
              className={cn(navItem, 'max-md:hidden')}
            >
              <LogOut aria-hidden />
              {t('logOut')}
            </button>
          </nav>
        </aside>
        <div className="flex min-w-0 flex-[999_1_640px] flex-col">{children}</div>
      </div>
    </div>
  )
}

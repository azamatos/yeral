import { Link, useMatch } from '@tanstack/react-router'
import type { Me } from '@yeral/contract/account'
import { formatPhone } from '@yeral/domain/phone'
import { Avatar } from '@yeral/ui/avatar'
import { cn } from '@yeral/ui/cn'
import { Drawer, DrawerContent, DrawerHeader, DrawerTrigger } from '@yeral/ui/drawer'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@yeral/ui/menu'
import { ChevronDown, ChevronUp, LogOut, User, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { useLogOut } from '@/features/log-out'

/**
 * The signed-in header's avatar and its menu (Auth «Logged-in header»): the person's name and phone, Profile, then
 * «Log out». A popover 260 wide under the avatar; a bottom sheet under 768 (the caption). Both are rendered and CSS
 * shows the one for the screen, so the server's page and the browser's agree. My bookings and favourites join with
 * their pages (P4 slices 3 and 5), the language row with a market's second language.
 */
export function AccountMenu({ me }: { me: Me }) {
  const t = useTranslations('account')
  const lang = useLocale()
  const [menuOpen, setMenuOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const close = () => {
    setMenuOpen(false)
    setSheetOpen(false)
  }
  // in the account area, which needs someone signed in, logging out goes Home
  const inAccount = Boolean(useMatch({ from: '/$lang/_site/account', shouldThrow: false }))
  const { logOut, loggingOut } = useLogOut({ home: inAccount, onDone: close })
  const name = me.name ?? me.firstName
  const phone = formatPhone(me.phone)

  const trigger = (open: boolean) => (
    <button
      type="button"
      data-account-trigger
      aria-label={name ? t('menu', { name }) : t('menuNoName')}
      className={cn(
        'ml-2 inline-flex h-11 flex-none cursor-pointer items-center gap-1.5 rounded-pill border border-n-300 bg-n-0 py-0 pr-2.5 pl-[5px] text-n-900',
        'hover:bg-n-50 focus-visible:shadow-focus focus-visible:outline-none',
      )}
    >
      <PersonMark firstName={me.firstName} size={32} />
      {open ? <ChevronUp aria-hidden className="size-4" /> : <ChevronDown aria-hidden className="size-4" />}
    </button>
  )
  const profile = (
    <Link to="/$lang/account/profile" params={{ lang }}>
      <User aria-hidden />
      {t('profile')}
    </Link>
  )

  return (
    <>
      <span className="contents max-sm:hidden">
        <Menu open={menuOpen} onOpenChange={setMenuOpen}>
          <MenuTrigger asChild>{trigger(menuOpen)}</MenuTrigger>
          <MenuContent className="w-[260px] [&_[role=menuitem]_svg]:size-5!">
            <MenuLabel className="flex-row items-center gap-3 px-2.5 pt-2.5 pb-2">
              <PersonMark firstName={me.firstName} size={40} />
              <span className="flex min-w-0 flex-col gap-0.5">
                {name && <span className="text-body leading-5 font-semibold break-words text-n-900">{name}</span>}
                <span className="text-dense text-n-600 tabular-nums">{phone}</span>
              </span>
            </MenuLabel>
            <MenuSeparator />
            <MenuItem asChild>{profile}</MenuItem>
            <MenuSeparator />
            <MenuItem
              disabled={loggingOut}
              onSelect={(e) => {
                // the menu stays until the session is over, so a failure can be tried again
                e.preventDefault()
                logOut()
              }}
            >
              <LogOut aria-hidden />
              {t('logOut')}
            </MenuItem>
          </MenuContent>
        </Menu>
      </span>
      <span className="contents sm:hidden">
        <Drawer open={sheetOpen} onOpenChange={setSheetOpen}>
          <DrawerTrigger asChild>{trigger(sheetOpen)}</DrawerTrigger>
          <DrawerContent {...(name ? {} : { 'aria-describedby': undefined })}>
            <DrawerHeader
              leading={<PersonMark firstName={me.firstName} size={40} />}
              title={name ?? phone}
              subtitle={name ? <span className="tabular-nums">{phone}</span> : undefined}
              closeLabel={t('close')}
            />
            <nav aria-label={t('sections')} className="flex flex-col p-2 pb-4">
              <Link to="/$lang/account/profile" params={{ lang }} onClick={close} className={sheetRow}>
                <User aria-hidden />
                {t('profile')}
              </Link>
              <span aria-hidden className="mx-3 my-1.5 h-px bg-n-200" />
              <button type="button" onClick={logOut} disabled={loggingOut} aria-busy={loggingOut || undefined} className={sheetRow}>
                <LogOut aria-hidden />
                {t('logOut')}
              </button>
            </nav>
          </DrawerContent>
        </Drawer>
      </span>
    </>
  )
}

/** The person's initial on tint (the boards draw «A» for Aýjemal), or a person icon until they have a name. */
function PersonMark({ firstName, size }: { firstName: string | null; size: 32 | 40 }) {
  if (firstName) return <Avatar name={firstName} size={size} aria-hidden />
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex flex-none items-center justify-center rounded-pill bg-a-50 text-a-600',
        size === 32 ? 'size-8' : 'size-10',
      )}
    >
      <UserRound className={size === 32 ? 'size-4' : 'size-5'} />
    </span>
  )
}

/** A row of the phone sheet: 48 high for touch (the nearest drawn pattern: the business MoreSheet rows). */
const sheetRow = cn(
  'flex h-12 w-full cursor-pointer items-center gap-3 rounded-input px-3 text-left text-body text-n-900 no-underline',
  'hover:bg-group focus-visible:shadow-focus-inset focus-visible:outline-none disabled:cursor-progress disabled:text-n-500',
  '[&_svg]:size-5 [&_svg]:flex-none [&_svg]:text-n-600',
)

/** The avatar button the screen shows (the menu's, or the phone sheet's under 768), for the focus to go to. */
export function visibleAccountTrigger(within: HTMLElement | null): HTMLElement | undefined {
  return [...(within?.querySelectorAll<HTMLElement>('[data-account-trigger]') ?? [])].find((el) => el.offsetParent !== null)
}

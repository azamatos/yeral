import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from '@tanstack/react-router'
import type { Me } from '@yeral/contract/account'
import { formatPhone } from '@yeral/domain/phone'
import { keys } from '@yeral/sdk'
import { useSdk } from '@yeral/sdk/react'
import { Avatar } from '@yeral/ui/avatar'
import { cn } from '@yeral/ui/cn'
import { Drawer, DrawerContent, DrawerHeader, DrawerTrigger } from '@yeral/ui/drawer'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@yeral/ui/menu'
import { toast } from '@yeral/ui/toast'
import { ChevronDown, ChevronUp, LogOut, UserRound } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { useErrorText } from '@/shared/i18n'

/**
 * The signed-in header's avatar and its menu (Auth «Logged-in header»): the person's name and phone, then the account's
 * places and «Log out». A popover 260 wide under the avatar; a bottom sheet under 768 (the caption). Both are rendered
 * and CSS shows the one for the screen, so the server's page and the browser's agree. My bookings and favourites join
 * with their pages (P4 slices 3 and 5), the language row with a market's second language.
 */
export function AccountMenu({ me }: { me: Me }) {
  const t = useTranslations('account')
  const sdk = useSdk()
  const router = useRouter()
  const queryClient = useQueryClient()
  const errorText = useErrorText()
  const [menuOpen, setMenuOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const logout = useMutation(sdk.auth.logout())
  const name = me.name ?? me.firstName
  const phone = formatPhone(me.phone)

  const logOut = () =>
    logout.mutate(undefined, {
      onSuccess: () => {
        setMenuOpen(false)
        setSheetOpen(false)
        // nothing of the last person's stays in the cache but `me`, now null (a phone may be shared)
        queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== keys.me()[0] })
        // the header says «Log in» again, and a page that needs someone signed in sends the visitor on
        void router.invalidate()
      },
      onError: (error) => void toast(errorText(error)),
    })

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

  return (
    <>
      <span className="contents max-sm:hidden">
        <Menu open={menuOpen} onOpenChange={setMenuOpen}>
          <MenuTrigger asChild>{trigger(menuOpen)}</MenuTrigger>
          <MenuContent className="w-[260px]">
            <MenuLabel className="flex-row items-center gap-3 px-2.5 pt-2.5 pb-2">
              <PersonMark firstName={me.firstName} size={40} />
              <span className="flex min-w-0 flex-col gap-0.5">
                {name && <span className="text-body leading-5 font-semibold break-words text-n-900">{name}</span>}
                <span className="text-dense text-n-600 tabular-nums">{phone}</span>
              </span>
            </MenuLabel>
            <MenuSeparator />
            <MenuItem
              disabled={logout.isPending}
              onSelect={(e) => {
                // the menu stays until the session is over, so a failure can be tried again
                e.preventDefault()
                logOut()
              }}
              className="[&_svg]:size-5!"
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
            <div className="flex flex-col p-2 pb-4">
              <SheetRow icon={<LogOut />} onClick={logOut} busy={logout.isPending}>
                {t('logOut')}
              </SheetRow>
            </div>
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
function SheetRow({ icon, onClick, busy, children }: { icon: ReactNode; onClick: () => void; busy?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-busy={busy || undefined}
      className={cn(
        'flex h-12 w-full cursor-pointer items-center gap-3 rounded-input px-3 text-left text-body text-n-900',
        'hover:bg-group focus-visible:shadow-focus-inset focus-visible:outline-none disabled:cursor-progress disabled:text-n-500',
        '[&_svg]:size-5 [&_svg]:flex-none [&_svg]:text-n-600',
      )}
    >
      {icon}
      {children}
    </button>
  )
}

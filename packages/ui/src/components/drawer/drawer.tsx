import { X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button } from '../button'

/**
 * Right drawer, 480 (Account-Bookings `.drw`): details and edits without leaving the page — a booking, a client card,
 * filters on md. Under 768 it's a bottom sheet (max 92% high) with a grab handle.
 */
export const Drawer = Dialog.Root
export const DrawerTrigger = Dialog.Trigger
export const DrawerClose = Dialog.Close

export function DrawerContent({ className, children, ...props }: ComponentProps<typeof Dialog.Content>) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-scrim data-[state=open]:animate-fade-in" />
      <Dialog.Content
        {...props}
        className={cn(
          'fixed inset-x-0 bottom-0 z-41 flex max-h-[92%] w-full flex-col bg-n-0 outline-none',
          'rounded-t-card shadow-sheet data-[state=open]:animate-sheet-in',
          'sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-drawer sm:max-w-full sm:rounded-none sm:shadow-raised sm:data-[state=open]:animate-drawer-in',
          className,
        )}
      >
        <span aria-hidden className="mx-auto mt-2 block h-1 w-8 flex-none rounded-pill bg-n-300 sm:hidden" />
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  )
}

/** Header: optional leading media (photo, avatar), title and subtitle, close button. */
export function DrawerHeader({
  title,
  subtitle,
  leading,
  closeLabel,
}: {
  title: ReactNode
  subtitle?: ReactNode
  leading?: ReactNode
  closeLabel: string
}) {
  return (
    <div className="flex flex-none items-center gap-3.5 border-b border-n-200 px-4 pt-3 pb-4 sm:py-5 sm:pr-5 sm:pl-6">
      {leading}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Dialog.Title className="m-0 truncate text-[17px] leading-6 font-semibold text-n-900">{title}</Dialog.Title>
        {subtitle && <Dialog.Description className="m-0 truncate text-dense text-n-600">{subtitle}</Dialog.Description>}
      </div>
      <Dialog.Close asChild>
        <Button variant="ghost" iconOnly aria-label={closeLabel} className="size-9 rounded-s">
          <X />
        </Button>
      </Dialog.Close>
    </div>
  )
}

export function DrawerBody({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} className={cn('flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-5 sm:p-6', className)} />
}

/** Sticky footer with the actions for the current status; buttons share the width. */
export function DrawerFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      {...props}
      className={cn(
        'flex flex-none flex-wrap gap-3 border-t border-n-200 bg-n-0 px-4 pt-3 pb-4 sm:px-6 sm:py-4 [&>*]:flex-auto',
        className,
      )}
    />
  )
}

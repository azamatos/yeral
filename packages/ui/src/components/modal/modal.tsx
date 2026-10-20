import { X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button } from '../button'

/**
 * Modal (Account-Bookings / Auth `.mdl`): confirmations and short forms (≤5 fields); danger actions always here.
 * Widths 400 (login) / 480 / 560 (review) / 640. Under 768 it's a bottom sheet with a grab handle.
 * Scrim, focus trap, Esc closes and focus returns to the trigger (Radix Dialog).
 */
export const Modal = Dialog.Root
export const ModalTrigger = Dialog.Trigger
export const ModalClose = Dialog.Close

const widths = { 400: 'sm:w-modal-s sm:p-7', 480: 'sm:w-modal-m', 560: 'sm:w-modal-ml', 640: 'sm:w-modal-l' } as const

export function ModalContent({
  size = 480,
  className,
  children,
  ...props
}: ComponentProps<typeof Dialog.Content> & { size?: keyof typeof widths }) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-60 bg-scrim data-[state=open]:animate-fade-in" />
      <div className="pointer-events-none fixed inset-0 z-60 flex items-end justify-center sm:items-center sm:p-6">
        <Dialog.Content
          {...props}
          className={cn(
            'pointer-events-auto relative flex max-h-[92%] w-full flex-col gap-5 overflow-y-auto bg-n-0 outline-none',
            'rounded-t-card px-4 pt-3 pb-5 shadow-sheet data-[state=open]:animate-sheet-in',
            'sm:max-h-full sm:max-w-full sm:rounded-card sm:p-6 sm:shadow-raised sm:data-[state=open]:animate-pop-in',
            widths[size],
            className,
          )}
        >
          <span aria-hidden className="mx-auto block h-1 w-8 flex-none rounded-pill bg-n-300 sm:hidden" />
          {children}
        </Dialog.Content>
      </div>
    </Dialog.Portal>
  )
}

/**
 * Title row with the close button (ghost, 36). With `media` (the login's brand icon, Auth `.mtop`), the media and the
 * close button share the top row and the title with its lead goes under them, 8 apart.
 */
export function ModalHeader({
  title,
  closeLabel,
  media,
  children,
}: {
  title: ReactNode
  closeLabel: string
  media?: ReactNode
  children?: ReactNode
}) {
  const close = (
    <Dialog.Close asChild>
      <Button variant="ghost" iconOnly aria-label={closeLabel} className="-mt-1 -mr-2 size-9 flex-none rounded-s">
        <X />
      </Button>
    </Dialog.Close>
  )
  const heading = <Dialog.Title className="m-0 text-h3 text-n-900">{title}</Dialog.Title>
  if (media)
    return (
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          {media}
          {close}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          {heading}
          {children}
        </div>
      </div>
    )
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        {heading}
        {children}
      </div>
      {close}
    </div>
  )
}

export function ModalDescription({ className, ...props }: ComponentProps<typeof Dialog.Description>) {
  return <Dialog.Description {...props} className={cn('m-0 text-body text-n-600', className)} />
}

/** Actions on the right; on phones they share the width. Secondary first, the primary or danger action last. */
export function ModalActions({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} className={cn('flex flex-wrap justify-end gap-3 max-sm:[&>*]:flex-auto', className)} />
}

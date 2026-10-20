import { Dialog } from 'radix-ui'
import type { CSSProperties, ReactNode } from 'react'
import { cn } from './cn'

/**
 * A phone's bottom sheet (DS-Patterns `.y-sheet`: r16 16 0 0, the sheet shadow, the grab handle `.grab` 32 × 4): a modal
 * dialog that Esc, the scrim and a tap outside close, with the focus back on what opened it. `above` keeps a bar below
 * it visible and its scrim off it (the tab bar under the More sheet). Internal: the shell's sheets build on it.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  hideTitle = false,
  above,
  className,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The sheet's name; shown as its heading unless `hideTitle`. */
  title: ReactNode
  hideTitle?: boolean
  above?: string
  className?: string
  children: ReactNode
}) {
  const bottom: CSSProperties | undefined = above ? { bottom: above } : undefined
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-x-0 top-0 bottom-0 z-40 bg-scrim data-[state=open]:animate-fade-in" style={bottom} />
        <Dialog.Content
          aria-describedby={undefined}
          style={bottom}
          className={cn(
            'fixed inset-x-0 bottom-0 z-41 flex max-h-[92%] flex-col overflow-y-auto rounded-t-card bg-n-0 shadow-sheet outline-none data-[state=open]:animate-sheet-in',
            className,
          )}
        >
          <span aria-hidden className="mx-auto mt-2 mb-1 block h-1 w-8 flex-none rounded-pill bg-n-300" />
          {hideTitle ? <Dialog.Title className="sr-only">{title}</Dialog.Title> : null}
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export const SheetTitle = Dialog.Title
export const SheetClose = Dialog.Close

import { Dialog } from 'radix-ui'
import { useRef, type CSSProperties, type ReactNode } from 'react'
import { cn } from './cn'

/**
 * A phone's bottom sheet (DS-Patterns `.y-sheet`: r16 16 0 0, the sheet shadow, the grab handle `.grab` 32 × 4): a modal
 * dialog that Esc, the scrim and a tap outside close. The focus goes back to what opened it: `trigger` when it sits with
 * the sheet (it also gets `aria-expanded`), else whatever had the focus (More, in the tab bar). `above` keeps a bar below
 * it visible and its scrim off it (the tab bar under the More sheet); without it the sheet keeps clear of the phone's
 * home indicator. The sheet is named by a `SheetTitle` inside it (`sr-only` when not shown). Internal: the shell's
 * sheets build on it.
 */
export function Sheet({
  open,
  onOpenChange,
  trigger,
  above,
  className,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger?: ReactNode
  above?: string
  className?: string
  children: ReactNode
}) {
  const opener = useRef<HTMLElement | null>(null)
  const lifted: CSSProperties | undefined = above ? { bottom: above, maxHeight: `calc(92% - ${above})` } : undefined
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>}
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-x-0 top-0 bottom-0 z-40 bg-scrim data-[state=open]:animate-fade-in"
          style={above ? { bottom: above } : undefined}
        />
        <Dialog.Content
          aria-describedby={undefined}
          style={lifted}
          onOpenAutoFocus={() => {
            if (!trigger) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
          }}
          onCloseAutoFocus={(e) => {
            if (trigger) return
            e.preventDefault()
            opener.current?.focus()
          }}
          className={cn(
            'fixed inset-x-0 bottom-0 z-41 flex max-h-[92%] flex-col overflow-y-auto rounded-t-card bg-n-0 shadow-sheet outline-none data-[state=open]:animate-sheet-in',
            !above && 'pb-[env(safe-area-inset-bottom)]',
            className,
          )}
        >
          <span aria-hidden className="mx-auto mt-2 mb-1 block h-1 w-8 flex-none rounded-pill bg-n-300" />
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export const SheetTitle = Dialog.Title
export const SheetClose = Dialog.Close

/** The hairline between a sheet's groups (`.y-hdiv`: 6 12). */
export function SheetDivider() {
  return <div role="separator" className="mx-3 my-1.5 h-px flex-none bg-n-200" />
}

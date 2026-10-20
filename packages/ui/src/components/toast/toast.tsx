import { toast as sonner, Toaster as SonnerToaster } from 'sonner'

/**
 * Toast (Account-Bookings `.toast`): ink, bottom-left on desktop and full-width at the bottom on phones, 4–6 s, one at
 * a time, one optional action. Destructive results offer «Yzyna al» (undo) instead of a second confirmation.
 * Mount <Toaster label={t('…')} /> once; call `toast('…', { action: { label, onClick } })`.
 */
export function Toaster({ label }: { label?: string }) {
  return (
    <SonnerToaster
      // the toasts' region as screen readers name it, in the person's language (sonner adds its shortcut, «alt+T»)
      containerAriaLabel={label}
      position="bottom-left"
      visibleToasts={1}
      duration={5000}
      offset={24}
      mobileOffset={16}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex min-h-13 w-full items-center gap-3 rounded-m bg-n-900 py-1.5 pr-2 pl-4 font-sans text-body text-white shadow-raised sm:w-auto sm:max-w-[calc(100vw-48px)]',
          title: 'font-normal',
          actionButton:
            'ml-auto inline-flex h-10 flex-none cursor-pointer items-center rounded-m border-0 bg-transparent px-2.5 font-semibold text-a-200 hover:bg-ink-btn-hover focus-visible:shadow-focus',
        },
      }}
    />
  )
}

export const toast = sonner

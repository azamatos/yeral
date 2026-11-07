import { Check, CircleX, Info, TriangleAlert, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { toast as sonner, Toaster as SonnerToaster, type ExternalToast } from 'sonner'
import { cn } from '../../lib/cn'

/**
 * Toast — DS-Lists → 05 Callouts (A10) «Toasts · ink, 14/20, radius 12, min 48, max 440»: ink with a tinted icon
 * (success and info a-200, warning the pending line, error the danger line), one text action in a-200 600 (Undo, Try
 * again) and, when it must be closed by hand, an × in n-300. Bottom-left of the content on desktop (24 from the edge
 * unless a layout sets `--toast-left` / `--toast-bottom`: the business shell 272 beside its sidebar, 96 beside the
 * rail), bottom centre on a phone (full width minus the 16 gutters, 12 above the tab bar). One at a time — a new one
 * replaces the old; 5 s, paused on hover and while focused; an error with an action stays until closed or acted on.
 *
 * Mount `<Toaster label={t('notifications')} closeLabel={t('close')} />` once; call `toast('Saved')` (a done thing:
 * the check), `toast.info`, `toast.warning`, `toast.error('Couldn’t save.', { action: { label, onClick } })`.
 */
export function Toaster({ label, closeLabel }: { label?: string; closeLabel?: string }) {
  return (
    <SonnerToaster
      // the toasts' region as screen readers name it, in the person's language (sonner adds its shortcut, «alt+T»)
      containerAriaLabel={label}
      position="bottom-left"
      visibleToasts={1}
      duration={5000}
      offset={{ left: 'var(--toast-left, 24px)', bottom: 'var(--toast-bottom, 24px)' }}
      mobileOffset={{ left: 'var(--toast-left, 16px)', right: 'var(--toast-left, 16px)', bottom: 'var(--toast-bottom, 16px)' }}
      icons={{ success: <Check />, info: <Info />, warning: <TriangleAlert />, error: <CircleX />, close: <X /> }}
      toastOptions={{
        unstyled: true,
        closeButtonAriaLabel: closeLabel,
        classNames: {
          toast: cn(
            'flex min-h-12 w-full items-center gap-3 rounded-ctl-l bg-n-900 px-4 py-3 font-sans text-small text-white shadow-raised sm:w-auto sm:max-w-110',
            // with a text action or an ×: pad 8 8 8 16, the 32 button on top, the icon and a one-line text centred on it
            '[&:has([data-button])]:py-2 [&:has([data-button])]:pr-2 [&:has([data-close-button])]:py-2 [&:has([data-close-button])]:pr-2',
            '[&:has([data-button])_[data-icon]]:mt-1.5 [&:has([data-close-button])_[data-icon]]:mt-1.5',
          ),
          content: 'min-w-0 flex-1',
          title: 'font-normal',
          // the icon stays on the first line when the text wraps
          icon: "mt-0.5 flex flex-none self-start text-a-200 [&_svg:not([class*='size-'])]:size-5",
          warning: '[&_[data-icon]]:text-st-pending-line',
          error: '[&_[data-icon]]:text-danger-line',
          actionButton:
            'ml-auto inline-flex h-8 flex-none cursor-pointer items-center self-start rounded-ctl-s border-0 bg-transparent px-2.5 text-small font-semibold whitespace-nowrap text-a-200 hover:bg-ink-btn-hover focus-visible:shadow-focus',
          closeButton:
            'order-last inline-flex size-8 flex-none cursor-pointer items-center justify-center self-start rounded-ctl-s border-0 bg-transparent p-0 text-n-300 hover:bg-ink-btn-hover focus-visible:shadow-focus [&_svg]:size-4.5',
        },
      }}
    />
  )
}

export type ToastOptions = ExternalToast

function error(message: ReactNode, options?: ToastOptions) {
  // the board: errors are `role="alert"`; with an action they stay until closed or acted on
  const sticky = Boolean(options?.action)
  return sonner.error(<span role="alert">{message}</span>, {
    ...(sticky && { duration: Infinity, closeButton: true }),
    ...options,
  })
}

/** `toast('Saved')` is the success toast (a done thing, the check); the others by name. `dismiss(id)` closes one early. */
export const toast = Object.assign((message: ReactNode, options?: ToastOptions) => sonner.success(message, options), {
  success: (message: ReactNode, options?: ToastOptions) => sonner.success(message, options),
  info: (message: ReactNode, options?: ToastOptions) => sonner.info(message, options),
  warning: (message: ReactNode, options?: ToastOptions) => sonner.warning(message, options),
  error,
  dismiss: sonner.dismiss,
})

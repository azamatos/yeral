'use client'

import { Dialog as D } from 'radix-ui'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { cls } from '@/domain/time'

/**
 * Bottom sheet on phones (as in the mobile app), centred dialog from md up.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  hideTitle,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  hideTitle?: boolean
}) {
  const w = { sm: 'md:max-w-[400px]', md: 'md:max-w-[480px]', lg: 'md:max-w-[640px]', xl: 'md:max-w-[960px]' }[size]
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 animate-fade-in bg-[rgb(16_16_20/0.38)]" />
        <D.Content
          className={cls(
            'fixed inset-x-0 bottom-0 z-50 flex max-h-[calc(100dvh-24px)] animate-sheet-in flex-col rounded-t-sheet bg-white pb-[env(safe-area-inset-bottom)] shadow-sheet outline-none',
            'md:inset-auto md:left-1/2 md:top-1/2 md:max-h-[calc(100dvh-64px)] md:w-[calc(100%-48px)] md:-translate-x-1/2 md:-translate-y-1/2 md:animate-pop-in md:rounded-[20px] md:pb-0 md:shadow-pop',
            w,
          )}
        >
          <div className="mx-auto mb-1 mt-2 h-[5px] w-9 flex-none rounded-full bg-line-2 md:hidden" />
          <div className={cls('flex flex-none items-start gap-3 px-5 pb-2 pt-3 md:pt-5', hideTitle && 'sr-only')}>
            <div className="min-w-0 flex-1">
              <D.Title className="text-[19px] font-bold tracking-[-0.02em]">{title}</D.Title>
              {description ? <D.Description className="mt-1 text-[14px] text-ink-2">{description}</D.Description> : <D.Description className="sr-only">{typeof title === 'string' ? title : ''}</D.Description>}
            </div>
            <D.Close className="-mr-2 -mt-1 hidden size-9 items-center justify-center rounded-full text-ink-2 hover:bg-group md:flex" aria-label="Закрыть">
              <X size={20} strokeWidth={1.75} />
            </D.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">{children}</div>
          {footer && <div className="flex flex-none flex-col gap-2 border-t border-line px-5 py-3">{footer}</div>}
        </D.Content>
      </D.Portal>
    </D.Root>
  )
}

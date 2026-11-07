import { Button } from '@yeral/ui/button'
import { Drawer, DrawerContent, SheetHeader } from '@yeral/ui/drawer'
import type { ReactNode } from 'react'
import { useTranslations } from 'use-intl'

/**
 * The phone's summary sheet (C7-Booking C4.4 «390 · tap the bar → the summary sheet»): the bar's left part opens the
 * whole booking as a bottom sheet — «Your booking» with Clear beside the close, the card's body (services with ×,
 * «Add a service», Change for the specialist and the time, the total and «Pay at the place») and the step's primary
 * in the footer. Between 768 and 1023, where the card beside the steps is hidden too, it's the drawer.
 */
export function SummarySheet({
  open,
  onOpenChange,
  onClear,
  footer,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClear?: () => void
  footer: ReactNode
  children: ReactNode
}) {
  const t = useTranslations('booking')
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent aria-describedby={undefined} className="max-h-[85%]">
        <SheetHeader title={t('summaryLabel')} closeLabel={t('close')}>
          {onClear && (
            <Button variant="tertiary" size="s" aria-label={t('summary.clearLabel')} onClick={onClear}>
              {t('summary.clear')}
            </Button>
          )}
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pt-1 pb-4">{children}</div>
        {footer && (
          <div className="flex flex-none flex-col border-t border-n-200 px-4 pt-3 pb-[calc(16px+env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}

import { Button } from '@yeral/ui/button'
import { Checkbox } from '@yeral/ui/checkbox'
import { useMediaQuery } from '@yeral/ui/media-query'
import { Modal, ModalContent, ModalHeader } from '@yeral/ui/modal'
import { Popover, PopoverAnchor, PopoverContent } from '@yeral/ui/popover'
import { useRef, type ReactNode } from 'react'
import { useTranslations } from 'use-intl'

/**
 * The confirm of a move (B-Calendar `.mvpop`, book B-26 step 2): who and what, «10:00 → 14:45 · Aýna», «Notify the
 * client» (on), Back · Confirm. A popover of 280 beside the slot; under 768 a bottom sheet, as the slot's menu. Back,
 * Esc or a click outside go back to picking; a click on another slot (`data-move-slot`) moves it there.
 */
export function MoveConfirm({
  anchor,
  what,
  title,
  notify,
  pending,
  onNotify,
  onBack,
  onConfirm,
}: {
  /** The slot picked. */
  anchor: HTMLElement
  /** «Gözel A. · Women’s haircut». */
  what: string
  /** «10:00 → 14:45 · Aýna». */
  title: string
  notify: boolean
  pending: boolean
  onNotify: (notify: boolean) => void
  onBack: () => void
  onConfirm: () => void
}) {
  const t = useTranslations('moveBooking')
  const phone = useMediaQuery('(max-width: 767px)')
  const close = (open: boolean) => {
    if (!open && !pending) onBack()
  }
  // a click or Tab elsewhere keeps its focus
  const leftOutside = useRef(false)
  const focusSlot = (e: Event) => {
    e.preventDefault()
    if (!leftOutside.current) anchor.focus()
  }
  const form: ReactNode = (
    <>
      <Checkbox label={t('notify')} checked={notify} onChange={(e) => onNotify(e.target.checked)} className="min-h-9 font-medium" />
      <div className="flex justify-end gap-2">
        <Button variant="tertiary" size="s" className="max-sm:h-11" disabled={pending} onClick={onBack}>
          {t('back')}
        </Button>
        <Button size="s" className="max-sm:h-11" loading={pending} loadingLabel={t('confirming')} onClick={onConfirm}>
          {t('confirm')}
        </Button>
      </div>
    </>
  )

  if (phone)
    return (
      <Modal open onOpenChange={close}>
        <ModalContent size={400} aria-describedby={undefined} onCloseAutoFocus={focusSlot} className="gap-2.5">
          <ModalHeader title={title} closeLabel={t('close')}>
            <span className="text-dense text-n-600">{what}</span>
          </ModalHeader>
          {form}
        </ModalContent>
      </Modal>
    )
  return (
    <Popover open onOpenChange={close}>
      <PopoverAnchor virtualRef={{ current: anchor }} />
      <PopoverContent
        side="right"
        align="start"
        sideOffset={4}
        aria-label={title}
        onInteractOutside={(e) => {
          // another slot isn't leaving: the popover goes with it, from whichever comes first of the close and the pick
          if ((e.target as Element).closest('[data-move-slot]')) e.preventDefault()
          else leftOutside.current = true
        }}
        onCloseAutoFocus={focusSlot}
        className="flex w-70 min-w-0 flex-col gap-2.5 p-3.5"
      >
        <span className="text-dense text-n-600">{what}</span>
        <span className="text-[16px] leading-[22px] font-semibold">{title}</span>
        {form}
      </PopoverContent>
    </Popover>
  )
}

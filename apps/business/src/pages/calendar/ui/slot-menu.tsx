import { cn } from '@yeral/ui/cn'
import { Modal, ModalContent, ModalHeader } from '@yeral/ui/modal'
import { Popover, PopoverAnchor, PopoverContent } from '@yeral/ui/popover'
import { Lock, Plus } from 'lucide-react'
import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { useTranslations } from 'use-intl'

const ITEM =
  'flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-input border-0 bg-transparent px-2.5 py-1.5 text-left text-small text-n-900 hover:bg-n-50 focus-visible:bg-n-50 focus-visible:shadow-focus-inset focus-visible:outline-none max-sm:min-h-12 max-sm:gap-3 [&_svg]:size-[18px] [&_svg]:flex-none [&_svg]:text-n-600'

/**
 * What a free slot offers (B-Calendar `panel=slot-menu`, DS-Business SlotMenu; B-Mobile 2b as a sheet): «14:30 · Maral»
 * with the day, then New booking (comes with the quick booking, slice 4's B5) and Block time. A popover of 220 beside
 * the slot; under 768 a bottom sheet. Esc, a click outside or an item close it, the focus going back to the slot.
 */
export function SlotMenu({
  anchor,
  phone,
  title,
  date,
  onBook,
  onBlock,
  onClose,
}: {
  /** The slot button the menu opens from. */
  anchor: HTMLElement
  /** Under 768: the sheet instead of the popover (decided when the slot was tapped). */
  phone: boolean
  /** «14:30 · Maral». */
  title: string
  /** The day in words, under the title. */
  date: string
  /** Without it the item isn't offered (the quick booking isn't built yet). */
  onBook?: () => void
  onBlock: () => void
  onClose: () => void
}) {
  const t = useTranslations('calendar.slotMenu')
  const list = useRef<HTMLDivElement>(null)
  // the arrow keys move between the items, as in a menu
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    const items = Array.from(list.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
    if (items.length === 0) return
    e.preventDefault()
    const at = items.indexOf(document.activeElement as HTMLElement)
    const next = e.key === 'ArrowDown' ? (at + 1) % items.length : (at - 1 + items.length) % items.length
    items[next]?.focus()
  }
  const items: ReactNode = (
    <div ref={list} role="menu" aria-label={title} onKeyDown={onKeyDown} className="flex flex-col">
      {onBook && (
        <button type="button" role="menuitem" className={ITEM} onClick={onBook}>
          <Plus aria-hidden strokeWidth={1.75} />
          {t('newBooking')}
        </button>
      )}
      <button type="button" role="menuitem" className={ITEM} onClick={onBlock}>
        <Lock aria-hidden strokeWidth={1.75} />
        {t('blockTime')}
      </button>
    </div>
  )
  const close = (open: boolean) => {
    if (!open) onClose()
  }
  const back = (e: Event) => {
    e.preventDefault()
    anchor.focus()
  }

  if (phone)
    return (
      <Modal open onOpenChange={close}>
        <ModalContent size={400} aria-describedby={undefined} onCloseAutoFocus={back} className="gap-2 px-2">
          <div className="px-2">
            <ModalHeader title={title} closeLabel={t('close')}>
              <span className="text-dense text-n-600">{date}</span>
            </ModalHeader>
          </div>
          {items}
        </ModalContent>
      </Modal>
    )
  return (
    <Popover open onOpenChange={close}>
      <PopoverAnchor virtualRef={{ current: anchor }} />
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={2}
        aria-label={title}
        onCloseAutoFocus={back}
        className={cn('flex w-55 min-w-0 flex-col p-1.5')}
      >
        <div className="flex flex-col px-2.5 pt-1.5 pb-1">
          <span className="text-label text-n-600 uppercase">{title}</span>
          <span className="text-dense text-n-600">{date}</span>
        </div>
        {items}
      </PopoverContent>
    </Popover>
  )
}

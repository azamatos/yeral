import { useMutation, useQuery } from '@tanstack/react-query'
import type { CalendarBooking } from '@yeral/contract/calendar'
import { cannotMoveDetailsSchema } from '@yeral/contract/errors'
import { useFmt } from '@yeral/i18n'
import { isApiError } from '@yeral/sdk'
import { toast } from '@yeral/ui/toast'
import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { canMoveBooking } from '@/entities/booking'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'

/** The slot picked: whose, on which day and when, and the slot's button, which the confirm opens from. */
export type MoveTarget = { staffId: string; date: string; start: number; anchor: HTMLElement }

export type MoveBooking = ReturnType<typeof useMoveBooking>

/**
 * Move mode (book B-26, decision D3: no dragging yet): `code` is the address's `?move=`, so a reload or a link from
 * the bookings list stays in it. The booking is read on its own, as the day on screen may be another; one that can't
 * be moved (started, answered, gone) isn't moved. A slot picked waits for the confirm; a refusal is said in a toast
 * and the grid stays in move mode for another slot. Esc leaves.
 */
export function useMoveBooking({
  slug,
  code,
  date,
  now,
  people,
  onLeave,
}: {
  slug: string
  code: string | undefined
  /** The day on screen: a slot picked on another isn't on it. */
  date: string
  now: number
  /** The grid's columns, for a refusal's name. */
  people: readonly { staffId: string; name: string }[]
  onLeave: () => void
}) {
  const t = useTranslations('moveBooking')
  const fmt = useFmt()
  const locale = useLocale()
  const sdk = useSdk()
  const errorText = useErrorText()
  const read = useQuery({ ...sdk.calendar.booking(slug, code ?? '', locale), enabled: !!code })
  const move = useMutation(sdk.calendar.move(slug))
  const [picked, setPicked] = useState<MoveTarget | null>(null)
  const [notify, setNotify] = useState(true)
  // another booking on its way starts afresh
  const [moving, setMoving] = useState(code)
  if (moving !== code) {
    setMoving(code)
    setPicked(null)
    setNotify(true)
  }

  const booking = code && read.data && canMoveBooking(read.data, now) ? read.data : null
  // another day, or the slot gone from under it (the day changed by a colleague): nothing's picked
  const target = booking && picked?.date === date && picked.anchor.isConnected ? picked : null

  const active = !!booking
  useEffect(() => {
    if (!active) return
    // a popover or sheet open takes Esc first (Radix marks it handled): one press, one step back
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) onLeave()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, onLeave])

  /** «10:00» and «14:45», each with its day when the move changes the day: «Fri, 16 Oct · 10:00». */
  const times = (b: CalendarBooking, to: MoveTarget) => {
    const at = (day: string, start: number) =>
      b.date === to.date ? fmt.time(start) : t('when', { date: fmt.shortWeekdayDate(day), time: fmt.time(start) })
    return { from: at(b.date, b.start), to: at(to.date, to.start) }
  }

  const refusal = (b: CalendarBooking, error: unknown) => {
    const details = isApiError(error, 'cannot_move') ? cannotMoveDetailsSchema.safeParse(error.details) : null
    if (!details?.success) return errorText(error)
    const { problem, staffId, busy } = details.data
    const name = people.find((p) => p.staffId === staffId)?.name ?? ''
    if (problem === 'staff_cannot_do') return t('refused.service', { name })
    if (problem === 'elsewhere' && busy) return t('refused.elsewhere', { name, time: fmt.timeRange(busy.start, busy.end) })
    const buffer = b.items.at(-1)?.bufferAfter ?? 0
    return t('refused.fit', { length: fmt.duration(b.end - b.start), buffer: buffer > 0 ? 'yes' : 'no' })
  }

  const confirm = () => {
    if (!booking || !target) return
    // a shared booking stays shared on a column of its own; a column of someone else's hands it to them
    const keeps = booking.items.some((i) => i.staffId === target.staffId)
    move.mutate(
      {
        code: booking.code,
        date: target.date,
        start: target.start,
        notifyClient: notify,
        ...(keeps ? {} : { staffId: target.staffId }),
      },
      {
        onSuccess: () => {
          toast(t('moved', { ...times(booking, target), notified: notify ? 'yes' : 'no' }))
          onLeave()
        },
        onError: (error) => {
          toast(refusal(booking, error))
          setPicked(null)
        },
      },
    )
  }

  return {
    booking,
    target,
    notify,
    setNotify,
    pending: move.isPending,
    /** The confirm's line: «10:00 → 14:45 · Aýna». */
    summary: booking && target ? { ...times(booking, target), name: people.find((p) => p.staffId === target.staffId)?.name ?? '' } : null,
    pick: (slot: Omit<MoveTarget, 'date'>) => setPicked({ ...slot, date }),
    /** Back to picking a slot. */
    back: () => setPicked(null),
    confirm,
  }
}

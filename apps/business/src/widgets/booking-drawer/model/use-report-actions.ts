import { useMutation } from '@tanstack/react-query'
import type { CalendarBooking } from '@yeral/contract/calendar'
import { canComplain, statusWithoutNoShow } from '@yeral/domain/lifecycle'
import type { ComplaintType } from '@yeral/domain/model'
import { toast } from '@yeral/ui/toast'
import { useEffect, useRef } from 'react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { stateOf } from './report-rules'

/** What a report sends (book B-28): the kind, and for «Other» what happened in words. */
export type ReportInput = { type: ComplaintType; text?: string }

export type ReportActions = ReturnType<typeof useReportActions>

/**
 * Filing a report and taking one back (book B-28, Q-207; `calendar.complain`, `takeBackComplaint`), each with its
 * toast and the toast's Undo doing the other quietly: a report filed is taken back; a report removed is filed again
 * (the same kind and words, under the name of whoever presses Undo and the time they do, as the api has no restore),
 * offered only while the rules still take that kind (a no-show past its 24 hours after the visit has no Undo). The
 * booking reads back changed through the sdk's invalidation. One instance per drawer: the two places that act (the
 * menu, the box) share its pending state.
 */
export function useReportActions(slug: string, now: number) {
  const t = useTranslations('bookingDrawer.report')
  const sdk = useSdk()
  const errorText = useErrorText()
  const complain = useMutation(sdk.calendar.complain(slug))
  const takeBack = useMutation(sdk.calendar.takeBackComplaint(slug))

  const file = (b: CalendarBooking, input: ReportInput, done?: () => void, undo = false) => {
    complain.mutate(
      { code: b.code, type: input.type, ...(input.text ? { text: input.text } : {}) },
      {
        onSuccess: () => {
          done?.()
          if (undo) return
          const words = input.type === 'noshow' ? (b.complaint ? t('markedNoShowReplaces') : t('markedNoShow')) : t('saved')
          // the undo runs later: it takes the report back as the api holds it then
          toast(words, { action: { label: t('undo'), onClick: () => latest.current.remove(b, undefined, true) } })
        },
        onError: (error) => toast(errorText(error)),
      },
    )
  }

  const remove = (b: CalendarBooking, done?: () => void, undo = false) => {
    const was = b.complaint
    takeBack.mutate(b.code, {
      onSuccess: () => {
        done?.()
        if (undo || !was) return
        const wasNoShow = was.type === 'noshow' && b.status === 'noshow'
        const words = wasNoShow ? t('removedNoShow', { status: statusWithoutNoShow(b, now) }) : t('removed')
        // the booking as it is without the report: Undo files the same kind only while the rules still take it
        const without = { ...stateOf(b), complaintType: null, status: wasNoShow ? statusWithoutNoShow(b, now) : b.status }
        const again = canComplain(without, was.type, now) === null
        toast(words, {
          ...(again
            ? {
                action: {
                  label: t('undo'),
                  onClick: () => latest.current.file(b, { type: was.type, ...(was.text ? { text: was.text } : {}) }, undefined, true),
                },
              }
            : {}),
        })
      },
      onError: (error) => toast(errorText(error)),
    })
  }

  const latest = useRef({ file, remove })
  useEffect(() => {
    latest.current = { file, remove }
  })

  return { file, remove, filing: complain.isPending, removing: takeBack.isPending }
}

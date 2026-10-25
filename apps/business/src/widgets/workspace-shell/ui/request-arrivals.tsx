import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { diffDays, today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { toast } from '@yeral/ui/toast'
import { Clock } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslations } from 'use-intl'
import { useJoin } from '@/entities/booking'
import { useSdk } from '@/shared/api'

/**
 * The toast a new request brings on any page of the workspace (B-Shell, DS-Business RequestArrivalToast): «New
 * request: Ejegyz T. · Aýna · today · 15:30» and «Open», which opens it in the calendar's drawer. Only the requests
 * this person may see here (the list is theirs); the ones already waiting when the page opened stay quiet.
 */
export function RequestArrivals({ slug }: { slug: string }) {
  const t = useTranslations('shell.arrival')
  const fmt = useFmt()
  const sdk = useSdk()
  const navigate = useNavigate()
  const join = useJoin()
  const list = useQuery(sdk.requests.list(slug))
  // the codes heard of so far; null until the first answer
  const seen = useRef<Set<string> | null>(null)

  useEffect(() => {
    const items = list.data?.items
    if (!items) return
    const known = seen.current
    seen.current = new Set(items.map((r) => r.code))
    if (!known) return
    for (const r of items) {
      if (known.has(r.code)) continue
      const now = today(Date.now())
      const days = diffDays(r.date, now)
      const day = days === 0 ? t('today') : days === 1 ? t('tomorrow') : fmt.shortWeekdayDate(r.date)
      const staff = [...new Set(r.items.map((i) => i.staff ?? ''))]
      const what = join([r.client.name, ...(r.kind === 'move' ? [] : staff), day, fmt.time(r.start)], 'dot')
      toast(t(r.kind === 'move' ? 'move' : 'new', { what }), {
        icon: <Clock aria-hidden className="size-4 text-st-pending-line" />,
        action: {
          label: t('open'),
          onClick: () =>
            void navigate({
              to: '/w/$slug/calendar',
              params: { slug },
              search: { ...(r.date === now ? {} : { date: r.date }), request: r.code },
            }),
        },
      })
    }
  }, [list.data, fmt, t, join, navigate, slug])

  return null
}

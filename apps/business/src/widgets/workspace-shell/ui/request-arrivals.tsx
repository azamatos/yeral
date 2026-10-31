import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type { BookingRequest } from '@yeral/contract/requests'
import { diffDays, today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { toast } from '@yeral/ui/toast'
import { Clock, TimerOff } from 'lucide-react'
import { useCallback, useEffect, useRef } from 'react'
import { useTranslations } from 'use-intl'
import { useJoin } from '@/entities/booking'
import { useSdk } from '@/shared/api'
import { nextWarningIn, useBrowserNotifications, warningsDue } from '@/shared/lib/browser-notifications'

/** What the workspace says about a request: it arrived (a new one or a client's move), or it's about to run out. */
type Word = 'new' | 'move' | 'warn'

/**
 * What a request brings on any page of the workspace (B-Shell, DS-Business RequestArrivalToast; book B-16 step 9,
 * S-16, F-123, F-170; the owner's choice D1 of the slice 4 plan): a new request or a client's time change, «New
 * request: Ejegyz T. · Aýna · today · 15:30» with «Open», and five minutes before one runs out, «Request time running
 * out: …», for those who may answer it (the api's `warnAt`, kept on the page's own clock so it fires in a background
 * tab too). In front: the toast with the soft sound. In the background: the browser notification with the sound, if
 * allowed, whose click brings the tab back and opens the request in the calendar's drawer. Only the requests this
 * person may see here (the list is theirs); the ones already waiting when the page opened stay quiet.
 */
export function RequestArrivals({ slug }: { slug: string }) {
  const sdk = useSdk()
  const list = useQuery(sdk.requests.list(slug))
  const say = useSay(slug)
  // the codes heard of so far; null until the first answer
  const seen = useRef<Set<string> | null>(null)
  // the warnings given
  const warned = useRef(new Set<string>())

  useEffect(() => {
    const items = list.data?.items
    if (!items) return
    const known = seen.current
    // every code heard of stays heard of: one that drops out of the list and comes back isn't new
    seen.current = new Set([...(known ?? []), ...items.map((r) => r.code)])
    if (!known) return
    for (const r of items) if (!known.has(r.code)) say(r.kind === 'move' ? 'move' : 'new', r)
  }, [list.data, say])

  useEffect(() => {
    const items = list.data?.items
    if (!items) return
    let timer: number | undefined
    const check = () => {
      const now = Date.now()
      for (const r of warningsDue(items, now, warned.current)) {
        warned.current.add(r.code)
        say('warn', r)
      }
      const wait = nextWarningIn(items, now, warned.current)
      if (wait !== null) timer = window.setTimeout(check, wait)
    }
    check()
    return () => window.clearTimeout(timer)
  }, [list.data, say])

  return null
}

/** Says a word about a request: the toast in front, the browser notification in the background, the sound with both. */
function useSay(slug: string) {
  const t = useTranslations('shell.arrival')
  const fmt = useFmt()
  const navigate = useNavigate()
  const join = useJoin()
  const notifications = useBrowserNotifications()
  return useCallback(
    (word: Word, r: BookingRequest) => {
      const now = today(Date.now())
      const days = diffDays(r.date, now)
      const day = days === 0 ? t('today') : days === 1 ? t('tomorrow') : fmt.shortWeekdayDate(r.date)
      const staff = [...new Set(r.items.map((i) => i.staff ?? ''))]
      const what = join([r.client.name, ...(r.kind === 'move' ? [] : staff), day, fmt.time(r.start)], 'dot')
      const open = () =>
        void navigate({
          to: '/w/$slug/calendar',
          params: { slug },
          search: { ...(r.date === now ? {} : { date: r.date }), request: r.code },
        })
      notifications.sound()
      if (notifications.hidden() && notifications.permission() === 'granted') {
        notifications.show({ title: t(`${word}Title`), body: what, tag: `${word}:${r.code}`, onClick: open })
        return
      }
      const Icon = word === 'warn' ? TimerOff : Clock
      toast(t(word, { what }), {
        icon: <Icon aria-hidden className="size-4 text-st-pending-line" />,
        action: { label: t('open'), onClick: open },
      })
    },
    [t, fmt, join, navigate, notifications, slug],
  )
}

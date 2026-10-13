'use client'

import { ArrowLeft, CalendarClock, CalendarPlus, Check, Clock, Info, Navigation, Phone, PhoneCall, RotateCcw, Store, X } from 'lucide-react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Suspense, useState } from 'react'
import type { BookingView } from '@/api'
import { isMock } from '@/api'
import { useBooking, useBookingAction, useMyReviews, useReviewAction } from '@/api/hooks'
import { demoSalon } from '@/api/mock'
import { catalog } from '@/api/mock/seed'
import { cancelDeadline } from '@/domain/logic'
import { cls, hm, minutesUntil } from '@/domain/time'
import { useFmt } from '@/lib/format'
import { downloadIcs } from '@/lib/ics'
import { telHref } from '@/lib/links'
import { Avatar, Empty, Note, Skeleton, Stars, STATUS_COLORS, StatusBadge } from '@/components/ui/bits'
import { Button, ButtonLink } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'

function Hero({ b, fresh }: { b: BookingView; fresh: boolean }) {
  const t = useTranslations('bookingDetail')
  const c = STATUS_COLORS[b.view]
  const title =
    b.view === 'pending' ? t('pendingTitle') : b.view === 'confirmed' ? t('confirmedTitle') : b.view === 'done' ? t('doneTitle') : b.view === 'cancelled' ? t('cancelledTitle') : b.view === 'declined' ? t('declinedTitle') : b.view === 'noshow' ? t('noshowTitle') : t('expiredTitle')
  const text =
    b.view === 'pending'
      ? b.rescheduled ? t('rescheduledNote') : t('pendingText', { name: b.staffName })
      : b.view === 'confirmed' ? t('confirmedText', { name: b.staffName })
      : b.view === 'cancelled' ? (b.cancelledBy === 'salon' ? t('cancelledBySalon') : t('cancelledByYou'))
      : b.view === 'noshow' ? t('noshowText')
      : b.view === 'expired' ? t('expiredText')
      : ''
  const Icon = b.view === 'pending' ? Clock : b.view === 'confirmed' || b.view === 'done' ? Check : X
  return (
    <div className={cls('flex gap-4', fresh ? 'flex-col items-center py-4 text-center' : 'items-start')}>
      <div className={cls('flex flex-none items-center justify-center rounded-full transition-colors', fresh ? 'size-20' : 'size-14')} style={{ background: c.bg, color: c.dot }}>
        <Icon size={fresh ? 36 : 26} strokeWidth={2.2} />
      </div>
      <div>
        {fresh && <div className="mb-1 text-[14px] font-semibold text-acc-ink">{t('newRequest')}</div>}
        <h1 className={cls('font-bold tracking-[-0.03em]', fresh ? 'text-[30px] md:text-[36px]' : 'text-[26px] md:text-[30px]')}>{title}</h1>
        {text && <p className={cls('mt-1 max-w-[520px] text-[15px] leading-relaxed text-ink-2', fresh && 'mx-auto')}>{text}</p>}
        {b.reason && (b.view === 'declined' || b.view === 'cancelled') && <p className="mt-1 text-[15px] text-ink-2">{t('reason', { reason: b.reason })}</p>}
      </div>
    </div>
  )
}

/** Mock only: the salon side, until the business workspace is connected. */
function DemoSalonPanel({ b }: { b: BookingView }) {
  const t = useTranslations('demo')
  const toast = useToast()
  if (!isMock) return null
  const sal = catalog().salons.find((x) => x.id === b.salonId)
  if (!sal) return null
  if (sal.demo === 'auto') return b.status === 'pending' ? <Note tone="gray" className="mt-4" icon={<Info size={16} />}>{t('autoNote')}</Note> : null
  const canAnswer = b.status === 'pending' || (b.status === 'confirmed' && !b.proposal && b.view === 'confirmed')
  if (!canAnswer) return null
  return (
    <div className="mt-6 rounded-card border border-dashed border-acc-line bg-acc-tint/40 p-4">
      <div className="flex items-center gap-2 text-[14px] font-semibold text-acc-ink">
        <Store size={17} strokeWidth={1.75} />
        {t('panelTitle')}
      </div>
      <p className="mt-1 text-[13.5px] text-ink-2">{t('panelText', { salon: sal.name })}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {b.status === 'pending' && <Button size="sm" variant="dark" onClick={() => demoSalon.confirm(b.id)}>{t('confirm')}</Button>}
        {b.status === 'pending' && <Button size="sm" variant="outline" onClick={() => demoSalon.decline(b.id, t('declineReason'))}>{t('decline')}</Button>}
        <Button size="sm" variant="outline" onClick={() => { if (!demoSalon.propose(b.id)) toast(t('proposeFail')) }}>{t('propose')}</Button>
      </div>
    </div>
  )
}

function CancelDialog({ b, open, onOpenChange }: { b: BookingView; open: boolean; onOpenChange: (v: boolean) => void }) {
  const t = useTranslations('bookingDetail')
  const f = useFmt()
  const toast = useToast()
  const act = useBookingAction()
  const reasons = t('cancelReasons').split('|')
  const [reason, setReason] = useState(reasons[0])
  const late = minutesUntil(b.date, b.start) < b.salon.cancelHours * 60
  const dl = cancelDeadline(b.salon.cancelHours, b)
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('cancelTitle')}
      description={late ? t('cancelLate', { hours: b.salon.cancelHours }) : t('cancelFree', { when: f.when(dl.date, dl.min) })}
      size="sm"
      footer={
        <>
          <Button variant="dangerSolid" block disabled={act.isPending} onClick={() => act.mutate({ kind: 'cancel', id: b.id, reason }, { onSuccess: () => { onOpenChange(false); toast(t('cancelledToast')) } })}>
            {t('cancelConfirm')}
          </Button>
          <Button variant="ghost" block onClick={() => onOpenChange(false)}>{t('keep')}</Button>
        </>
      }
    >
      <div className="mb-2 text-[14px] font-medium">{t('cancelReason')}</div>
      <div className="flex flex-col gap-1">
        {reasons.map((r) => (
          <label key={r} className="flex h-11 cursor-pointer items-center gap-3 rounded-xl px-2 hover:bg-group">
            <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="size-5 accent-[#5a3ff0]" />
            {r}
          </label>
        ))}
      </div>
    </Dialog>
  )
}

function ReviewBox({ b }: { b: BookingView }) {
  const t = useTranslations('bookingDetail')
  const f = useFmt()
  const toast = useToast()
  const act = useReviewAction()
  const { data: mine } = useMyReviews()
  const existing = mine?.find((r) => r.bookingId === b.id)
  const [rating, setRating] = useState(0)
  const [text, setText] = useState('')
  const [tags, setTags] = useState<string[]>([])
  if (existing)
    return (
      <div className="mt-6 rounded-card border border-line p-4">
        <div className="flex items-center justify-between">
          <div className="text-[14px] font-semibold">{t('yourReview')}</div>
          <Stars n={existing.rating} size={14} />
        </div>
        <p className="mt-2 text-[15px] leading-relaxed">{existing.text}</p>
        <div className="mt-1 text-[12.5px] text-ink-3">{f.dayMonth(existing.date)}</div>
      </div>
    )
  return (
    <div className="mt-6 rounded-card border border-line p-5">
      <div className="text-[18px] font-semibold">{t('reviewTitle')}</div>
      <Stars n={rating} size={30} onPick={setRating} className="-ml-1 mt-2" />
      {rating > 0 && (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            {t('reviewTags').split('|').map((x) => (
              <button key={x} type="button" onClick={() => setTags(tags.includes(x) ? tags.filter((y) => y !== x) : [...tags, x])} className={cls('h-8 rounded-full border px-3 text-[13.5px]', tags.includes(x) ? 'border-acc bg-acc-tint font-semibold text-acc-ink' : 'border-line')}>
                {x}
              </button>
            ))}
          </div>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder={t('reviewText')} className="mt-3 w-full resize-none rounded-input border border-line-2 px-4 py-3 text-[15px] outline-none focus:border-acc" />
          <Button className="mt-3" disabled={text.trim().length < 3 || act.isPending} onClick={() => act.mutate({ kind: 'create', bookingId: b.id, rating, text: text.trim(), tags }, { onSuccess: () => toast(t('reviewThanks')) })}>
            {t('reviewSend')}
          </Button>
        </>
      )}
    </div>
  )
}

function Detail() {
  const t = useTranslations('bookingDetail')
  const ta = useTranslations('account')
  const ts = useTranslations('status')
  const f = useFmt()
  const toast = useToast()
  const { id } = useParams<{ id: string }>()
  const fresh = useSearchParams().get('new') === '1'
  const { data: b, isPending } = useBooking(id)
  const act = useBookingAction()
  const [cancel, setCancel] = useState(false)

  if (isPending) return <Skeleton className="h-64 rounded-card" />
  if (!b) return <Empty icon={<CalendarClock size={28} />} title={t('notFound')} text={t('notFoundText')} />

  const upcoming = b.view === 'pending' || b.view === 'confirmed'
  const rebook = `/${b.salon.slug}/book?svc=${b.services.map((x) => x.id).join(',')}&staff=${b.staffId}&step=time`
  const channel = b.channel === 'phone' ? t('channelPhone') : b.channel === 'direct' ? t('channelDirect') : t('channelMarketplace')

  return (
    <div className="max-w-[760px]">
      {!fresh && (
        <Link href="/account/bookings" className="mb-5 inline-flex items-center gap-1.5 text-[14px] font-medium text-ink-2 hover:text-ink">
          <ArrowLeft size={16} />
          {ta('bookings')}
        </Link>
      )}
      <Hero b={b} fresh={fresh} />

      {/* mirror screens: what the salon did, what the client can answer */}
      {b.proposal && (b.view === 'pending' || b.view === 'confirmed') && (
        <div className="mt-6 rounded-card border border-amber-line bg-amber-tint p-4">
          <div className="font-semibold text-amber-ink">{t('proposalTitle')}</div>
          <div className="mt-1 text-[14.5px] text-[#7a4308]">{t('proposalText', { name: b.proposalStaffName ?? b.staffName, when: f.whenInline(b.proposal.date, b.proposal.start) })}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="dark" disabled={act.isPending} onClick={() => act.mutate({ kind: 'accept', id: b.id })}>{t('proposalAccept')}</Button>
            <Button size="sm" variant="outline" disabled={act.isPending} onClick={() => act.mutate({ kind: 'decline', id: b.id })}>{t('proposalDecline')}</Button>
          </div>
        </div>
      )}
      {b.channel === 'phone' && upcoming && (
        <div className="mt-6 flex items-start gap-3 rounded-card bg-group p-4">
          <PhoneCall size={20} strokeWidth={1.75} className="mt-0.5 text-ink-2" />
          <div className="flex-1">
            <div className="font-semibold">{t('phoneTitle')}</div>
            <div className="text-[14px] text-ink-2">{t('phoneText')}</div>
          </div>
          <Button size="sm" variant="outline" onClick={() => act.mutate({ kind: 'notMe', id: b.id }, { onSuccess: () => toast(t('notMeDone')) })}>{t('notMe')}</Button>
        </div>
      )}
      {b.needsClientConfirm && upcoming && (
        <div className="mt-6 rounded-card border border-amber-line bg-amber-tint p-4">
          <div className="font-semibold text-amber-ink">{b.clientConfirmed ? t('confirmedByYou') : t('confirmDayBefore')}</div>
          {!b.clientConfirmed && (
            <>
              <div className="mt-1 text-[14px] text-[#7a4308]">{t('confirmDayBeforeText')}</div>
              <Button size="sm" variant="dark" className="mt-3" onClick={() => act.mutate({ kind: 'attend', id: b.id })}>{t('confirmDayBeforeBtn')}</Button>
            </>
          )}
        </div>
      )}

      {/* the booking itself */}
      <div className="mt-6 rounded-[20px] border border-line">
        <div className="flex items-center justify-between gap-3 border-b border-line p-4 md:p-5">
          <div>
            <StatusBadge status={b.view} label={ts(b.view)} />
            <div className="mt-2 text-[20px] font-bold tracking-[-0.02em]">{f.longDay(b.date)}</div>
            <div className="text-[15px] text-ink-2">{hm(b.start)} – {hm(b.start + b.dur)} · {f.dur(b.dur)}</div>
          </div>
          {upcoming && (
            <Button variant="outline" size="sm" icon={<CalendarPlus size={16} strokeWidth={1.75} />} onClick={() => downloadIcs({ id: b.id, title: `${b.salon.name} · ${b.staffName}`, date: b.date, start: b.start, dur: b.dur, location: `${b.salon.address}, Ашхабад` })}>
              <span className="hidden sm:inline">{t('addToCalendar')}</span>
            </Button>
          )}
        </div>
        <Link href={`/${b.salon.slug}`} className="flex items-center gap-3 border-b border-line p-4 hover:bg-group-2 md:px-5">
          <img src={b.salon.photo} alt="" className="size-12 rounded-xl object-cover" />
          <div className="min-w-0">
            <div className="font-semibold">{b.salon.name}</div>
            <div className="truncate text-[14px] text-ink-2">{b.salon.kind} · {b.salon.address}, {b.salon.district}</div>
          </div>
        </Link>
        <div className="flex items-center gap-3 border-b border-line p-4 md:px-5">
          <Avatar name={b.staffName} size={48} acc />
          <div className="font-semibold">{b.staffName}</div>
        </div>
        <div className="p-4 md:px-5">
          {b.services.map((x) => (
            <div key={x.id} className="flex justify-between py-1.5 text-[15px]">
              <span>{x.name} <span className="text-ink-3">· {f.dur(x.dur)}</span></span>
              <span>{f.money(x.price)}</span>
            </div>
          ))}
          <div className="mt-2 flex justify-between border-t border-line pt-3 font-semibold">
            <span>{t('total')}</span>
            <span>{f.money(b.price)} <span className="text-[13px] font-normal text-ink-3">· {t('payAtSalon')}</span></span>
          </div>
          {b.comment && <Note className="mt-4"><b>{t('comment')}:</b> {b.comment}</Note>}
          <div className="mt-3 text-[12.5px] text-ink-3">{t('booked', { date: f.dayMonth(new Date(b.createdAt + 5 * 3600000).toISOString().slice(0, 10)) })} · {channel}</div>
        </div>
      </div>

      <DemoSalonPanel b={b} />

      {/* actions */}
      <div className="mt-6 flex flex-wrap gap-2">
        {upcoming && (
          <>
            <ButtonLink href={`/${b.salon.slug}/book?replace=${b.id}&step=time`} variant="outline" icon={<RotateCcw size={16} strokeWidth={1.75} />}>{t('reschedule')}</ButtonLink>
            <Button variant="danger" icon={<X size={16} strokeWidth={2} />} onClick={() => setCancel(true)}>{t('cancel')}</Button>
          </>
        )}
        {(b.view === 'declined' || b.view === 'expired') && <ButtonLink href={rebook}>{t('pickOtherTime')}</ButtonLink>}
        {(b.view === 'done' || b.view === 'cancelled' || b.view === 'noshow') && <ButtonLink href={rebook}>{t('bookAgain')}</ButtonLink>}
        <ButtonLink href={telHref(b.salon.phone)} variant="ghost" icon={<Phone size={16} strokeWidth={1.75} />}>{t('call')}</ButtonLink>
        <ButtonLink href={`/${b.salon.slug}#about`} variant="ghost" icon={<Navigation size={16} strokeWidth={1.75} />}>{t('route')}</ButtonLink>
      </div>
      {fresh && (
        <div className="mt-8 flex gap-3">
          <ButtonLink href="/account/bookings" variant="dark">{ta('bookings')}</ButtonLink>
        </div>
      )}

      {b.view === 'done' && <ReviewBox b={b} />}
      <CancelDialog b={b} open={cancel} onOpenChange={setCancel} />
    </div>
  )
}

export default function BookingDetailPage() {
  return (
    <Suspense>
      <Detail />
    </Suspense>
  )
}

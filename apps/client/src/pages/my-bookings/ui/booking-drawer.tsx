import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import type { BookingDetail } from '@yeral/contract/bookings'
import { localOf, today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { directionsUrl, telHref } from '@yeral/lib/links'
import { isApiError } from '@yeral/sdk'
import { useSdk } from '@yeral/sdk/react'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { useClock } from '@yeral/ui/clock'
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from '@yeral/ui/drawer'
import { Field } from '@yeral/ui/field'
import { Textarea } from '@yeral/ui/input'
import { KeyValueList } from '@yeral/ui/key-value'
import { MapDot, MapFrame, MapMarker, MapPin } from '@yeral/ui/map-frame'
import { Skeleton } from '@yeral/ui/skeleton'
import { Timeline } from '@yeral/ui/timeline'
import { toast } from '@yeral/ui/toast'
import { Building2, CircleAlert, Clock, Info, Navigation, Pencil, Phone } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { BookingStatusBadge, NOTE_MAX } from '@/entities/booking'
import { useErrorText } from '@/shared/i18n'
import { drawerSteps, offersOf } from '../model/drawer'
import { ByLine, UNDO_REASONS, useCancelledBy } from './booking-row'
import { CancelBooking } from './cancel-booking'
import { OfferTimes, useWhen } from './offer-times'

/** A part of the drawer's body (`.dsec`): a caps label above. */
function Part({ label, labelId, children }: { label: string; labelId?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={labelId} className="flex flex-col gap-2">
      <h3 id={labelId} className="m-0 text-label text-n-500 uppercase">
        {label}
      </h3>
      {children}
    </section>
  )
}

const Line = () => <div aria-hidden className="h-px flex-none bg-n-200" />

/**
 * `/{lang}/account/bookings/{code}` — a booking in the drawer over My bookings (Account-Bookings `.drw`, book C-28–C-31;
 * a bottom sheet on phones). Closing it goes back to the list on its tab. The booking comes from `GET
 * /me/bookings/{code}`; one not in this account (or a code made up) says so.
 */
export function BookingDrawer() {
  const t = useTranslations('bookingDrawer')
  const failed = useTranslations('failed')
  const { code = '' } = useParams({ strict: false })
  const search: { tab?: 'upcoming' | 'past' } = useSearch({ strict: false })
  const navigate = useNavigate()
  const lang = useLocale()
  const sdk = useSdk()
  const detail = useQuery(sdk.bookings.detail(code, lang))
  const close = () => void navigate({ to: '/$lang/account/bookings', params: { lang }, search: { tab: search.tab }, resetScroll: false })
  const missing = isApiError(detail.error, 'not_found') || isApiError(detail.error, 'validation_error')
  return (
    <Drawer open onOpenChange={(open) => !open && close()}>
      <DrawerContent aria-describedby={undefined}>
        {detail.data ? (
          <BookingView booking={detail.data} onClose={close} />
        ) : (
          <>
            <DrawerHeader title={t('title')} closeLabel={t('close')} />
            <DrawerBody>
              {detail.isError ? (
                <Callout
                  tone={missing ? 'neutral' : 'danger'}
                  icon={<CircleAlert />}
                  action={
                    missing ? undefined : (
                      <Button size="s" variant="secondary" onClick={() => void detail.refetch()}>
                        {failed('action')}
                      </Button>
                    )
                  }
                >
                  {missing ? t('notFound') : t('loadFailed')}
                </Callout>
              ) : (
                <div aria-hidden className="flex flex-col gap-3">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-5 w-64" />
                  <Skeleton className="h-32 w-full" />
                </div>
              )}
            </DrawerBody>
          </>
        )}
      </DrawerContent>
    </Drawer>
  )
}

/** The booking itself: its header, status, offered times or move, history, details, note, address, rule and actions. */
function BookingView({ booking: b, onClose }: { booking: BookingDetail; onClose: () => void }) {
  const t = useTranslations('bookingDrawer')
  const list = useTranslations('myBookings')
  const words = useTranslations()
  const fmt = useFmt()
  const lang = useLocale()
  const sdk = useSdk()
  const now = useClock()
  const errorText = useErrorText()
  const at = useWhen()
  const cancelledBy = useCancelledBy()
  const withdraw = useMutation(sdk.bookings.withdrawMove(lang))
  const restore = useMutation(sdk.bookings.restore(lang))
  const saveNote = useMutation(sdk.bookings.note(lang))
  const [cancelling, setCancelling] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const items = b.what.type === 'appointment' ? b.what.items : []
  const staff = [...new Set(items.map((i) => i.staff).filter((s): s is string => Boolean(s)))]
  const services = items.map((i) => i.service).join(', ')
  const what = staff.length > 0 ? list('what', { services, staff: staff.join(', ') }) : services
  const when = at(b.date, b.start, b.end)
  const stamp = (epoch: number) => {
    const local = localOf(epoch)
    return t('at', { date: fmt.relativeShortDate(local.date, today(now)), time: fmt.time(local.min) })
  }
  const offers = offersOf(b)
  const live = offers?.times.some((o) => o.state === 'free') ? offers : null
  const passed = offers && !live ? offers : null
  const ahead = b.status === 'pending' || b.status === 'confirmed'
  const late = ahead && now >= b.cancelDeadline
  const by = cancelledBy(b)
  const reason = b.decline
    ? { reason: words(`declineReasons.${b.decline.reason}`), text: b.decline.text }
    : b.businessCancel
      ? { reason: words(`businessCancelReasons.${b.businessCancel.reason}`), text: b.businessCancel.text }
      : b.cancelReason
        ? { reason: b.cancelReason, text: null }
        : null
  const reasonText = (r: { reason: string; text: string | null }) =>
    r.text ? list('reasonWith', { reason: r.reason, text: r.text }) : list('reason', { reason: r.reason })
  const pos = { lat: b.geo.lat, lng: b.geo.lng }
  const google = directionsUrl(pos, b.business.name)
  const place = [b.address, b.floor].filter(Boolean).join(', ')
  const page = { to: '/$lang/b/$slug' as const, params: { lang, slug: b.business.slug } }

  const undo = () =>
    restore.mutate(
      { code: b.code, body: undefined },
      {
        onSuccess: () => toast(t('undone')),
        onError: (error) => {
          const why = UNDO_REASONS.find((r) => isApiError(error, r))
          toast(why ? words('undo.failed', { reason: words(`undo.reasons.${why}`) }) : errorText(error))
        },
      },
    )
  const save = () =>
    saveNote.mutate(
      { code: b.code, body: { note: draft.trim() } },
      {
        onSuccess: () => {
          setEditing(false)
          toast(t('noteSaved'))
        },
        onError: (error) => toast(errorText(error)),
      },
    )

  const steps = drawerSteps(b).map((s) => {
    const state = s.tone === 'current' ? t('now') : s.tone === 'todo' ? t('next') : t('done')
    if (s.kind === 'event') return { tone: s.tone, title: t(`events.${s.event}`), caption: stamp(s.at), state }
    if (s.kind === 'waiting') return { tone: s.tone, title: t('waiting'), state }
    if (s.kind === 'visit') return { tone: s.tone, title: t('visit'), caption: when, state }
    return { tone: s.tone, title: s.request ? t('tookRequest') : t('tookOffer'), caption: s.code, state }
  })

  const footer: ReactNode[] = []
  if (b.status === 'pending' && b.actions.editNote && !editing)
    footer.push(
      <Button
        key="note"
        variant="ghost"
        onClick={() => {
          setDraft(b.clientNote ?? '')
          setEditing(true)
        }}
      >
        <Pencil aria-hidden />
        {t('editNote')}
      </Button>,
    )
  if (b.actions.cancel)
    footer.push(
      <Button key="cancel" variant="danger" onClick={() => setCancelling(true)}>
        {t('cancel')}
      </Button>,
    )
  if (b.status === 'confirmed' && !b.actions.cancel)
    footer.push(
      <p key="late" className="m-0 flex basis-full items-start gap-2.5 rounded-m bg-group px-3.5 py-3 text-small text-n-900">
        <Info aria-hidden className="mt-px size-4.5 flex-none text-n-600" strokeWidth={1.75} />
        {t('lateCall')}
      </p>,
      <Button key="call" asChild variant="secondary">
        <a href={telHref(b.business.phone)}>
          <Phone aria-hidden />
          <span className="tabular-nums">{t('callNumber', { phone: fmt.phone(b.business.phone) })}</span>
        </a>
      </Button>,
    )
  if (b.actions.restore)
    footer.push(
      <Button key="undo" variant="secondary" loading={restore.isPending} onClick={() => !restore.isPending && undo()}>
        {t('undo')}
      </Button>,
    )
  if (live || passed)
    footer.push(
      <Button key="other" asChild variant={passed ? 'primary' : 'secondary'}>
        <Link {...page}>{t('otherTime')}</Link>
      </Button>,
    )
  else if (b.actions.bookAgain)
    footer.push(
      <Button key="again" asChild variant="primary">
        <Link {...page}>{t('bookAgain')}</Link>
      </Button>,
    )

  return (
    <>
      <DrawerHeader
        leading={
          b.business.photo ? (
            <img src={b.business.photo.url} alt="" className="block size-14 flex-none rounded-m object-cover" />
          ) : (
            <span aria-hidden className="flex size-14 flex-none items-center justify-center rounded-m bg-n-100 text-n-500">
              <Building2 className="size-6" strokeWidth={1.75} />
            </span>
          )
        }
        title={
          <Link {...page} className="text-n-900 hover:underline">
            {b.business.name}
          </Link>
        }
        subtitle={b.business.category}
        closeLabel={t('close')}
      />
      <DrawerBody>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <BookingStatusBadge status={b.status} />
          </div>
          {b.status === 'pending' && <p className="m-0 text-[17px] leading-6 font-semibold">{t('pending')}</p>}
          {b.status === 'confirmed' && <p className="m-0 text-[17px] leading-6 font-semibold">{t('confirmed', { when })}</p>}
          {b.status === 'noshow' && <p className="m-0 text-[17px] leading-6 font-semibold">{t('noshow')}</p>}
          {by && (
            <p className="m-0 flex items-center gap-2 text-[17px] leading-6 font-semibold [&_svg]:size-4.5 [&_svg]:text-n-600">
              {by.icon}
              {by.text}
            </p>
          )}
          {b.status === 'pending' && <span className="text-dense text-n-600">{t('pendingSub')}</span>}
          {late && b.status === 'confirmed' && <span className="text-dense text-n-600">{t('late')}</span>}
          {reason && <span className="text-dense text-n-600">{reasonText(reason)}</span>}
          {b.offerTakenBy && (
            <Link
              to="/$lang/account/bookings/$code"
              params={{ lang, code: b.offerTakenBy }}
              search={(prev: Record<string, unknown>) => prev}
              className="self-start text-dense font-semibold text-a-600 hover:text-a-700"
            >
              {b.cancelledBy === 'system' ? list('tookRequest', { code: b.offerTakenBy }) : list('tookOffer', { code: b.offerTakenBy })}
            </Link>
          )}
          {passed && <ByLine>{list('offersPassed')}</ByLine>}
        </div>

        {live && <OfferTimes code={b.code} business={b.business.name} services={services} offers={live} />}

        {b.reschedule && (
          <section
            aria-labelledby={`${b.code}-move`}
            className="flex flex-col items-start gap-2 rounded-m border border-st-pending-line bg-st-pending-bg px-4 py-3.5"
          >
            <h3 id={`${b.code}-move`} className="m-0 flex items-center gap-2 text-[15px] leading-5 font-semibold text-n-900">
              <Clock aria-hidden className="size-4.5 flex-none text-st-pending-ink" strokeWidth={2} />
              {t('move')}
            </h3>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[15px] leading-[22px] text-n-900 tabular-nums">
              <span>{when}</span>
              <span aria-hidden className="text-n-600">
                →
              </span>
              <span className="sr-only">{t('moveArrow')}</span>
              <span className="font-semibold">{at(b.reschedule.date, b.reschedule.start, b.reschedule.end)}</span>
            </span>
            <span className="text-dense text-n-600">{t('moveKeeps')}</span>
            <Button
              size="s"
              variant="danger-ghost"
              className="-ml-3"
              loading={withdraw.isPending}
              onClick={() =>
                !withdraw.isPending &&
                withdraw.mutate(
                  { code: b.code, body: undefined },
                  { onSuccess: () => toast(t('withdrawn')), onError: (e) => toast(errorText(e)) },
                )
              }
            >
              {t('withdraw')}
            </Button>
          </section>
        )}

        {b.moveRefused && (
          <Callout tone="neutral" icon={<Info />}>
            <span className="flex flex-col gap-0.5">
              {t('moveRefused')}
              {b.moveRefused.reason && (
                <span className="text-dense text-n-600">
                  {reasonText({ reason: words(`declineReasons.${b.moveRefused.reason}`), text: b.moveRefused.text })}
                </span>
              )}
            </span>
          </Callout>
        )}

        <Timeline aria-label={t('steps')} items={steps} />

        <Line />

        <KeyValueList
          items={[
            ...(services ? [{ key: t('services', { count: items.length }), value: services }] : []),
            ...(staff.length > 0 ? [{ key: t('specialist'), value: staff.join(', ') }] : []),
            { key: t('dateTime'), value: when },
            { key: t('duration'), value: fmt.duration(b.end - b.start) },
            ...(b.price ? [{ key: t('price'), value: fmt.price(b.price) }] : []),
            { key: t('payment'), value: t('atPlace') },
            { key: t('code'), value: <span className="tabular-nums">{b.code}</span> },
          ]}
        />

        {(b.status === 'pending' || b.clientNote) &&
          (editing ? (
            <div className="flex flex-col gap-2">
              <Field
                label={t('note')}
                counter={
                  draft.length > 0
                    ? { value: draft.length, max: NOTE_MAX, text: t('noteCount', { count: draft.length, max: NOTE_MAX }) }
                    : undefined
                }
              >
                <Textarea
                  value={draft}
                  maxLength={NOTE_MAX}
                  rows={3}
                  placeholder={t('notePlaceholder')}
                  onChange={(e) => setDraft(e.target.value)}
                  className="h-24 resize-y"
                />
              </Field>
              <div className="flex justify-end gap-2">
                <Button size="s" variant="ghost" onClick={() => setEditing(false)}>
                  {t('cancelEdit')}
                </Button>
                <Button size="s" variant="secondary" loading={saveNote.isPending} onClick={() => !saveNote.isPending && save()}>
                  {t('saveNote')}
                </Button>
              </div>
            </div>
          ) : (
            <Part label={t('note')}>
              <span className={b.clientNote ? 'text-small text-n-900' : 'text-small text-n-500'}>{b.clientNote ?? t('noNote')}</span>
            </Part>
          ))}

        <Line />

        <Part label={t('address')} labelId={`${b.code}-address`}>
          <span className="flex flex-col gap-0.5">
            <span className="text-[15px] leading-[22px] font-medium">{fmt.addressIn(place, b.city.name)}</span>
            {b.entranceNote && <span className="text-dense text-n-600">{b.entranceNote}</span>}
            <span className="text-dense text-n-600 tabular-nums">{fmt.phone(b.business.phone)}</span>
          </span>
          {/* a picture of the address written above; the pin names the place */}
          <MapFrame key={b.code} center={pos} zoom={b.geo.approximate ? 14 : 16} interactive={false} className="h-40 rounded-m">
            <MapMarker at={pos}>
              {b.geo.approximate ? (
                <span className="absolute size-37.5 -translate-1/2 rounded-pill border-[1.5px] border-a-500/45 bg-a-500/14" />
              ) : (
                <>
                  <MapPin hot className="-translate-y-2.5">
                    {b.business.name}
                  </MapPin>
                  <MapDot />
                </>
              )}
            </MapMarker>
          </MapFrame>
          <div className="flex flex-wrap gap-2 pt-1">
            {!b.geo.approximate && (
              <Button asChild size="s" variant="secondary">
                <a
                  href={google}
                  target="_blank"
                  rel="noopener noreferrer"
                  // the phone's own map app where there is one (book Q-108); the link is Google Maps for a computer
                  onClick={(e) => {
                    const own = directionsUrl(pos, b.business.name, navigator)
                    if (own === google) return
                    e.preventDefault()
                    location.href = own
                  }}
                >
                  <Navigation aria-hidden />
                  {t('directions')}
                </a>
              </Button>
            )}
            <Button asChild size="s" variant="secondary">
              <a
                href={telHref(b.business.phone)}
                aria-label={t('callLabel', { business: b.business.name, phone: fmt.phone(b.business.phone) })}
              >
                <Phone aria-hidden />
                {list('call')}
              </a>
            </Button>
          </div>
        </Part>

        {ahead && !late && (
          <p className="m-0 flex items-start gap-2.5 text-dense text-n-600">
            <Info aria-hidden className="mt-px size-4 flex-none" strokeWidth={1.75} />
            {t('rule', { when: stamp(b.cancelDeadline) })}
          </p>
        )}
      </DrawerBody>
      {footer.length > 0 && <DrawerFooter>{footer}</DrawerFooter>}
      <CancelBooking booking={b} what={what} when={when} open={cancelling} onOpenChange={setCancelling} onCancelled={onClose} />
    </>
  )
}

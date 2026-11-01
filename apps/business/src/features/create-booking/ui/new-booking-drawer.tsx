import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import type { ClientMatch } from '@yeral/contract/clients'
import { localized } from '@yeral/domain/model'
import { isPhone, nationalDigits, toE164 } from '@yeral/domain/phone'
import { addDays, parseYmd, today } from '@yeral/domain/time'
import { PHONE_RULES } from '@yeral/features/auth-by-phone'
import { useFmt } from '@yeral/i18n'
import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { Chip, ChipRadioGroup } from '@yeral/ui/chip'
import { DateStrip } from '@yeral/ui/date-strip'
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from '@yeral/ui/drawer'
import { Field } from '@yeral/ui/field'
import { useMediaQuery } from '@yeral/ui/media-query'
import { Segmented, SegmentedItem } from '@yeral/ui/segmented'
import { Switch } from '@yeral/ui/switch'
import { Textarea } from '@yeral/ui/input'
import { TimeSlot, TimeSlots } from '@yeral/ui/time-slots'
import { toast } from '@yeral/ui/toast'
import { useRef, useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import {
  currentStep,
  eligibleFor,
  missingOf,
  PARTS,
  quickServices,
  servicesOf,
  staffOf,
  totalOf,
  type NewBookingStart,
  type Person,
  type TeamSource,
} from '../model/new-booking'
import { ClientField } from './client-field'
import { ServicePicker } from './service-picker'

const SECTION_TITLE = 'text-small font-medium text-n-900'
const LINK =
  'cursor-pointer self-start border-0 bg-transparent p-0 text-small font-semibold text-a-600 hover:underline focus-visible:shadow-focus focus-visible:outline-none'

/**
 * The new booking (B-Calendar `panel=new`, book B-23, B-25; decision 6): Phone call or Walk-in, the client by number or
 * name, the services, the specialist, the nearest free times or another day's, the team's note, «Notify the client». It
 * saves confirmed; the toast's Undo takes it back while the client hasn't heard yet. A walk-in is today from the quarter
 * that holds now, the client told nothing. `people` are the ones the reader may book for: a specialist has their own.
 * Under 768 it's the quick sheet (B-Mobile 5a–5c, book B-24): the keypad up, the usual services as chips, the nearest
 * times as a grid, and another service, another time and the note a tap away.
 */
export function NewBookingDrawer({
  slug,
  start,
  people,
  specialist,
  now,
  onClose,
}: {
  slug: string
  start: NewBookingStart
  people: readonly Person[]
  specialist: boolean
  now: number
  onClose: () => void
}) {
  const t = useTranslations('newBooking')
  const tMissing = useTranslations('newBooking.missing')
  const tPart = useTranslations('newBooking.parts')
  const fmt = useFmt()
  const locale = useLocale()
  const sdk = useSdk()
  const errorText = useErrorText()
  const todayDate = today(now)
  const phone = useMediaQuery('(max-width: 767px)')
  const phoneField = useRef<HTMLInputElement>(null)

  const [source, setSource] = useState<TeamSource>('phone')
  const [digits, setDigits] = useState('')
  const [picked, setPicked] = useState<ClientMatch | null>(null)
  const [name, setName] = useState('')
  const [serviceIds, setServiceIds] = useState<readonly string[]>(start.serviceIds ?? [])
  const [staffId, setStaffId] = useState<string | null>(specialist ? (people[0]?.staffId ?? null) : (start.staffId ?? null))
  const [allServices, setAllServices] = useState(false)
  const [date, setDate] = useState(start.date < todayDate ? todayDate : start.date)
  const [time, setTime] = useState<number | null>(start.start ?? null)
  const [note, setNote] = useState('')
  const [notify, setNotify] = useState(true)
  // the quick sheet's parts behind a tap
  const [fullList, setFullList] = useState(false)
  const [otherTime, setOtherTime] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)

  // «Book again» and the client's card name the client: their number fills in, and the lookup finds them
  const seed = useQuery({ ...sdk.clients.card(slug, start.clientId ?? '', { lang: locale, history: 1 }), enabled: !!start.clientId })
  const [seeded, setSeeded] = useState(false)
  if (!seeded && seed.data?.phone) {
    setSeeded(true)
    setDigits(nationalDigits(seed.data.phone))
  }

  const complete = digits.length === PHONE_RULES.maxDigits
  const whole = useQuery({ ...sdk.clients.lookup(slug, { phone: digits }), enabled: !picked && complete })
  const known = whole.data?.items.find((c) => c.phone && nationalDigits(c.phone) === digits) ?? null
  const client = picked ?? (complete ? known : null)

  const menu = useQuery(sdk.settings.menu(slug))
  const services = servicesOf(menu.data, serviceIds)
  const ids = services.map((s) => s.id)
  const can = eligibleFor(people, services)
  const staff = specialist ? (people[0]?.staffId ?? null) : staffOf(staffId, people, services)
  const given = people.find((p) => p.staffId === staffId) ?? null
  const walkin = source === 'walkin'
  const day = walkin ? todayDate : date

  const free = useQuery({
    ...sdk.calendar.freeTimes(slug, { services: ids, date: day, ...(staff ? { staff } : {}) }),
    enabled: ids.length > 0,
    placeholderData: keepPreviousData,
  })
  const slots = free.data?.date === day ? free.data.slots : []
  const mine = staff ? slots.filter((s) => s.staffIds.includes(staff)) : []
  const nearest = (free.data?.nearest ?? []).filter((n) => !walkin || n.date === todayDate)
  // a walk-in starts at the first free start of today, unless another is picked
  const chosen = time ?? (walkin ? (mine[0]?.start ?? null) : null)
  const timeOk = chosen !== null && mine.some((s) => s.start === chosen)
  const total = totalOf(services)
  const hasClient = !!client || complete
  const missing = missingOf({ hasClient, services: services.length, staffId: staff, timeOk })

  const add = useMutation(sdk.calendar.add(slug))
  const undo = useMutation(sdk.calendar.undo(slug))
  const save = () => {
    const number = client?.phone ?? toE164(digits)
    if (!staff || chosen === null || !isPhone(number)) return
    const written = note.trim()
    const newName = name.trim()
    add.mutate(
      {
        source,
        phone: number,
        ...(!client && newName ? { name: newName } : {}),
        serviceIds: ids,
        staffId: staff,
        date: day,
        start: chosen,
        ...(written ? { note: written } : {}),
        notifyClient: notify,
      },
      {
        onSuccess: ({ code }) => {
          onClose()
          const words = phone
            ? t('savedQuick', {
                client: client?.name ?? newName ?? number,
                when: t('quickWhen', { day: dayWord(day).toLowerCase(), time: fmt.time(chosen) }),
                name: nameOf(staff),
              })
            : t('saved', { walkin: walkin ? 'yes' : 'no', notified: notify ? 'yes' : 'no' })
          toast(words, {
            action: {
              label: t('undo'),
              // the drawer's gone by now: `mutate`'s own callbacks wouldn't run
              onClick: () =>
                void undo.mutateAsync(code).then(
                  () => toast(t('undone')),
                  (error: unknown) => toast(errorText(error)),
                ),
            },
          })
        },
        onError: (error) => toast(errorText(error)),
      },
    )
  }

  const pickSource = (next: string) => {
    const to = next as TeamSource
    setSource(to)
    setNotify(to === 'phone')
    setTime(null)
  }
  const dayWord = (d: string) => (d === todayDate ? t('today') : d === addDays(todayDate, 1) ? t('tomorrow') : fmt.weekdayShort(d))
  const nameOf = (id: string) => people.find((p) => p.staffId === id)?.name ?? ''
  const price = t('meta', { length: fmt.timeRange(chosen ?? 0, (chosen ?? 0) + total.minutes), price: fmt.price(total.price) })
  const summary = t('summary', {
    date: fmt.weekdayDate(day),
    time: specialist ? fmt.timeRange(chosen ?? 0, (chosen ?? 0) + total.minutes) : price,
    name: staff ? nameOf(staff) : '',
  })
  const hint = !ids.length
    ? t('times.pickService')
    : can.length === 0
      ? t('times.nobody')
      : !free.isPending && nearest.length === 0
        ? t('times.none')
        : null
  const dayState = free.data?.days.find((d) => d.date === day)
  const message =
    !ids.length || can.length === 0
      ? null
      : !staff
        ? t('times.pickStaff')
        : free.isFetching
          ? null
          : dayState?.state === 'closed' || mine.length === 0
            ? t('times.dayFull')
            : time !== null && !timeOk
              ? t('times.gone', { time: fmt.time(time) })
              : null

  // a phone keeps them behind a tap, unless the time asked for needs another (a walk-in has only today's)
  const moreTimes = ids.length > 0 && can.length > 0 && (!phone || walkin || otherTime || (time !== null && !timeOk))
  const noteField = (
    <Field label={t('note')}>
      <Textarea placeholder={t('notePlaceholder')} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
    </Field>
  )

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <DrawerContent
        aria-describedby={undefined}
        // the keypad comes up with the sheet (B-Mobile 5a), when there's a number to type
        onOpenAutoFocus={(e) => {
          if (!phone || !phoneField.current) return
          e.preventDefault()
          phoneField.current.focus()
        }}
      >
        <DrawerHeader title={t('title')} closeLabel={t('close')} />
        <DrawerBody className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Segmented aria-label={t('source')} value={source} onValueChange={pickSource} className="self-start">
              <SegmentedItem value="phone">{t('phoneCall')}</SegmentedItem>
              <SegmentedItem value="walkin">{t('walkIn')}</SegmentedItem>
            </Segmented>
            {walkin && <span className="text-dense text-n-600">{t('walkInCaption', { time: fmt.time(currentStep(now)) })}</span>}
          </div>

          <ClientField
            slug={slug}
            digits={digits}
            client={client}
            name={name}
            showAverage={!specialist}
            quick={phone}
            phoneRef={phoneField}
            onDigits={setDigits}
            onClient={setPicked}
            onName={setName}
          />

          {menu.data && phone && !fullList && (
            <section className="flex flex-col gap-2.5">
              <span className={SECTION_TITLE}>{t('service')}</span>
              <div role="group" aria-label={t('service')} className="-mx-4 flex gap-2 overflow-x-auto px-4 py-0.5">
                {quickServices(menu.data, client?.usualServices ?? [], ids, specialist ? staff : staffId).map((s) => {
                  const on = ids.includes(s.id)
                  return (
                    <Chip
                      key={s.id}
                      selected={on}
                      className="h-11"
                      onClick={() => {
                        // the keypad goes on the first chip (B-Mobile 5b)
                        phoneField.current?.blur()
                        setServiceIds(on ? ids.filter((id) => id !== s.id) : [...ids, s.id])
                      }}
                    >
                      {localized(s.name, locale)}
                    </Chip>
                  )
                })}
                <Chip className="h-11" onClick={() => setFullList(true)}>
                  {t('anotherService')}
                </Chip>
              </div>
            </section>
          )}
          {menu.data && (!phone || fullList) && (
            <ServicePicker
              menu={menu.data}
              picked={services}
              onlyOf={given && (specialist || !allServices) ? given : null}
              showPrices={!specialist}
              onToggleAll={
                given && !specialist ? { all: allServices, toggle: () => setAllServices(!allServices), name: given.name } : undefined
              }
              onChange={setServiceIds}
            />
          )}

          <section className="flex flex-col gap-2.5">
            <span className={SECTION_TITLE}>{t('specialist')}</span>
            {specialist ? (
              <div className="flex items-center gap-2.5 rounded-m border border-n-200 p-3">
                <Avatar name={people[0]?.name ?? ''} src={people[0]?.photo?.url} size={32} letters={1} tone="tint" decorative />
                <span className="flex min-w-0 flex-col">
                  <span className="text-small font-semibold text-n-900">{people[0]?.name}</span>
                  <span className="text-dense text-n-600">{t('addedToYou')}</span>
                </span>
              </div>
            ) : (
              <ChipRadioGroup
                aria-label={t('specialist')}
                value={staff ?? ''}
                onValueChange={(id) => {
                  setStaffId(id || null)
                  setTime(null)
                }}
                options={[
                  // the quick sheet searches everyone who does it, and names the person on each time (B-Mobile 5b)
                  ...(phone ? [{ value: '', label: t('anySpecialist') }] : []),
                  ...people.map((p) => ({
                    value: p.staffId,
                    disabled: ids.length > 0 && !can.some((c) => c.staffId === p.staffId),
                    label: (
                      <>
                        <Avatar name={p.name} src={p.photo?.url} size={24} letters={1} tone="tint" decorative />
                        {p.name}
                      </>
                    ),
                  })),
                ]}
              />
            )}
            {ids.length > 0 && can.length === 0 && <Callout tone="warning">{t('noOneDoesAll')}</Callout>}
          </section>

          <section className="flex flex-col gap-2.5">
            <span className={SECTION_TITLE}>{t('nearest')}</span>
            {hint ? (
              <span className="text-dense text-n-600">{hint}</span>
            ) : (
              <div className={phone ? 'grid grid-cols-3 gap-2' : 'flex flex-wrap gap-2'}>
                {nearest.map((n) => {
                  const on = n.date === day && n.start === chosen && (!staff || n.staffId === staff)
                  const who = staff ? null : nameOf(n.staffId)
                  return (
                    <TimeSlot
                      key={`${n.date}|${n.start}|${n.staffId}`}
                      selected={on}
                      className={phone ? 'flex h-auto min-h-14 w-full min-w-0 flex-col items-center justify-center px-1' : undefined}
                      onClick={() => {
                        setDate(n.date)
                        setTime(n.start)
                        setStaffId(n.staffId)
                      }}
                    >
                      {phone ? (
                        <>
                          <span className="text-[15px] leading-5">{fmt.time(n.start)}</span>
                          <span className="max-w-full truncate text-[12px] leading-4 font-normal">
                            {dayWord(n.date)}
                            {who && t('dot')}
                            {who}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="font-normal">{dayWord(n.date)}</span> {fmt.time(n.start)}
                          {who && (
                            <span className="font-normal">
                              {t('dot')}
                              {who}
                            </span>
                          )}
                        </>
                      )}
                      <span className="sr-only">{fmt.weekdayDate(n.date)}</span>
                    </TimeSlot>
                  )
                })}
              </div>
            )}
          </section>

          {phone && !walkin && !moreTimes && ids.length > 0 && can.length > 0 && (
            <button type="button" className={LINK} onClick={() => setOtherTime(true)}>
              {t('anotherTime')}
            </button>
          )}
          {moreTimes && (
            <section className="flex flex-col gap-2.5">
              <span className={SECTION_TITLE}>{t(walkin ? 'today' : 'anotherTime')}</span>
              {!walkin && free.data && (
                <DateStrip
                  aria-label={t('anotherTime')}
                  prevLabel={t('earlierDays')}
                  nextLabel={t('laterDays')}
                  value={day}
                  onValueChange={(d) => {
                    setDate(d)
                    setTime(null)
                  }}
                  days={free.data.days.map((d) => ({
                    date: d.date,
                    weekday: dayWord(d.date),
                    day: parseYmd(d.date).getUTCDate(),
                    state: d.state === 'open' ? 'available' : d.state,
                    srText: d.closedReason ?? undefined,
                  }))}
                />
              )}
              {message && <span className="text-dense text-n-600">{message}</span>}
              <TimeSlots
                size="s"
                value={chosen === null ? undefined : String(chosen)}
                onValueChange={(v) => setTime(Number(v))}
                groups={PARTS.map((part) => ({
                  label: tPart(part.key),
                  slots: mine
                    .filter((s) => s.start >= part.from && s.start < part.to)
                    .map((s) => ({ value: String(s.start), label: fmt.time(s.start) })),
                }))}
              />
            </section>
          )}

          {!phone && noteField}
          <label className="flex cursor-pointer items-center justify-between gap-3">
            <span className="flex min-w-0 flex-col">
              <span className="text-small font-medium text-n-900">{t('notify')}</span>
              <span className="text-dense text-n-600">{t('notifyCaption')}</span>
            </span>
            <Switch checked={notify} onCheckedChange={setNotify} />
          </label>
          {phone &&
            (noteOpen ? (
              noteField
            ) : (
              <button type="button" className={LINK} onClick={() => setNoteOpen(true)}>
                {t('addNote')}
              </button>
            ))}
        </DrawerBody>
        <DrawerFooter className="items-center justify-between gap-3 max-sm:flex-col max-sm:items-stretch">
          <span className="min-w-0 text-dense text-n-600">
            {missing.length ? t('stillNeeded', { list: missing.map((m) => tMissing(m)).join(t('comma')) }) : summary}
          </span>
          <Button className="flex-none" disabled={missing.length > 0} loading={add.isPending} loadingLabel={t('saving')} onClick={save}>
            {t('save')}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

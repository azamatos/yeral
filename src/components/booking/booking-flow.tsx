'use client'

import { ArrowLeft, CalendarDays, Check, ChevronLeft, ChevronRight, Info, MessageSquare, Plus, Shuffle, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { SalonDetail, StaffPublic } from '@/api'
import { useBooking, useCreateBooking, useDay, useDays, useSession } from '@/api/hooks'
import { cls, hm, today } from '@/domain/time'
import { useFmt } from '@/lib/format'
import { PhoneAuth } from '@/components/auth/phone-auth'
import { Avatar, Note, Skeleton } from '@/components/ui/bits'
import { Button } from '@/components/ui/button'

type Step = 'services' | 'master' | 'time' | 'confirm'
const STEPS: Step[] = ['services', 'master', 'time', 'confirm']

/** Wizard state lives in the URL: refresh-safe, shareable, and the browser Back button walks the steps. */
type Draft = { step: Step; svc: string[]; staff: string | null; date?: string; time?: number; who?: string; replace?: string }

function read(sp: URLSearchParams): Draft {
  const time = sp.get('time')
  return {
    step: (sp.get('step') as Step) || 'services',
    svc: sp.get('svc')?.split(',').filter(Boolean) ?? [],
    staff: sp.get('staff'),
    date: sp.get('date') || undefined,
    time: time ? Number(time) : undefined,
    who: sp.get('who') || undefined,
    replace: sp.get('replace') || undefined,
  }
}

function href(slug: string, d: Draft) {
  const sp = new URLSearchParams()
  sp.set('step', d.step)
  if (d.svc.length) sp.set('svc', d.svc.join(','))
  if (d.staff) sp.set('staff', d.staff)
  if (d.date) sp.set('date', d.date)
  if (d.time !== undefined) sp.set('time', String(d.time))
  if (d.who) sp.set('who', d.who)
  if (d.replace) sp.set('replace', d.replace)
  return `/${slug}/book?${sp}`
}

/* ───────────── pieces ───────────── */

function Crumbs({ step, reachable, onGo, skipMaster }: { step: Step; reachable: (s: Step) => boolean; onGo: (s: Step) => void; skipMaster?: boolean }) {
  const t = useTranslations('booking')
  const label = { services: t('stepServices'), master: t('stepMaster'), time: t('stepTime'), confirm: t('stepConfirm') }
  const steps = skipMaster ? STEPS.filter((x) => x !== 'master') : STEPS
  return (
    <ol className="flex flex-wrap items-center gap-1.5 text-[14px]">
      {steps.map((s, i) => (
        <li key={s} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={14} className="text-ink-4" />}
          <button type="button" disabled={!reachable(s) || s === step} onClick={() => onGo(s)} className={cls(s === step ? 'font-semibold text-ink' : reachable(s) ? 'text-ink-2 hover:text-ink' : 'text-ink-4')}>
            {label[s]}
          </button>
        </li>
      ))}
    </ol>
  )
}

function Summary({ s, d, staff, cta, disabled, onNext, busy }: { s: SalonDetail; d: Draft; staff?: StaffPublic; cta: string; disabled: boolean; onNext: () => void; busy?: boolean }) {
  const t = useTranslations('booking')
  const f = useFmt()
  const svcs = d.svc.map((id) => s.menu.find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x)
  const dur = svcs.reduce((a, x) => a + x.dur, 0)
  const price = svcs.reduce((a, x) => a + x.price, 0)
  const from = svcs.some((x) => x.priceFrom)
  return (
    <>
      {/* desktop card */}
      <div className="sticky top-6 hidden rounded-[20px] border border-line p-5 lg:block">
        <div className="flex gap-3">
          <img src={s.photos[0]} alt="" className="size-16 flex-none rounded-xl object-cover" />
          <div className="min-w-0">
            <div className="truncate text-[16px] font-semibold">{s.name}</div>
            <div className="text-[13px] text-ink-2">★ {f.rating(s.rating.avg)} ({s.rating.count})</div>
            <div className="truncate text-[13px] text-ink-2">{s.address}, {s.district}</div>
          </div>
        </div>
        <div className="mt-4 border-t border-line pt-4">
          {!svcs.length && <div className="text-[14px] text-ink-3">{t('selectServicesHint')}</div>}
          {svcs.map((x) => (
            <div key={x.id} className="flex justify-between gap-3 py-1.5 text-[14.5px]">
              <div className="min-w-0">
                <div className="font-medium">{x.name}</div>
                <div className="text-[13px] text-ink-2">{f.dur(x.dur)}{d.step !== 'services' && ` · ${staff ? staff.name : t('withAny')}`}</div>
              </div>
              <div className="flex-none font-semibold">{f.price(x)}</div>
            </div>
          ))}
          {d.date && d.time !== undefined && (
            <div className="mt-2 flex items-center gap-2 rounded-xl bg-group px-3 py-2.5 text-[14px]">
              <CalendarDays size={17} strokeWidth={1.75} className="text-acc" />
              <span className="font-medium">{f.longDay(d.date)}, {hm(d.time)}–{hm(d.time + dur)}</span>
            </div>
          )}
        </div>
        <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
          <span className="font-semibold">{t('servicesTotal')}</span>
          <span className="text-[18px] font-bold">{from ? f.price({ price, priceFrom: true }) : f.money(price)}</span>
        </div>
        <div className="mt-0.5 text-right text-[12.5px] text-ink-3">{t('payAtSalon')}{dur ? ` · ${f.dur(dur)}` : ''}</div>
        <Button size="lg" block className="mt-4" disabled={disabled || busy} onClick={onNext}>
          {cta}
        </Button>
      </div>

      {/* phone bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-line bg-white px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 lg:hidden">
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-bold">{from ? f.price({ price, priceFrom: true }) : f.money(price)}</div>
          <div className="truncate text-[12.5px] text-ink-2">
            {d.date && d.time !== undefined ? `${f.when(d.date, d.time)}${staff ? ` · ${staff.name}` : ''}` : svcs.length ? `${svcs.length} · ${f.dur(dur)}` : t('selectServicesHint')}
          </div>
        </div>
        <Button pill disabled={disabled || busy} onClick={onNext}>
          {cta}
        </Button>
      </div>
    </>
  )
}

function ServicesStep({ s, d, set, fixed }: { s: SalonDetail; d: Draft; set: (p: Partial<Draft>) => void; fixed?: StaffPublic }) {
  const t = useTranslations()
  const f = useFmt()
  const menu = fixed ? s.menu.filter((x) => fixed.services.includes(x.id)) : s.menu
  const groups = [...new Set(menu.map((x) => x.group))]
  const [g, setG] = useState(groups[0])
  const toggle = (id: string) => set({ svc: d.svc.includes(id) ? d.svc.filter((x) => x !== id) : [...d.svc, id] })
  return (
    <>
      <h1 className="text-[28px] font-bold tracking-[-0.03em] md:text-[34px]">{t('booking.titleServices')}</h1>
      <p className="mt-1 text-[15px] text-ink-2">{fixed ? t('booking.subServicesStaff', { name: fixed.name }) : t('booking.subServices')}</p>
      <div className="no-scrollbar sticky top-0 z-10 -mx-4 mt-5 flex gap-2 overflow-x-auto bg-white px-4 py-2 md:mx-0 md:px-0">
        {groups.map((x) => (
          <button key={x} type="button" onClick={() => { setG(x); document.getElementById(`g-${x}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} className={cls('h-9 flex-none rounded-full px-4 text-[14px]', x === g ? 'bg-ink font-semibold text-white' : 'bg-group font-medium hover:bg-line')}>
            {x}
          </button>
        ))}
      </div>
      {groups.map((grp) => (
        <section key={grp} id={`g-${grp}`} className="scroll-mt-16 pt-4">
          <h2 className="mb-2 text-[17px] font-semibold">{grp}</h2>
          <div className="flex flex-col gap-2.5">
            {menu.filter((x) => x.group === grp).map((x) => {
              const on = d.svc.includes(x.id)
              return (
                <button key={x.id} type="button" onClick={() => toggle(x.id)} className={cls('flex items-center gap-4 rounded-card border p-4 text-left transition-colors', on ? 'border-acc bg-acc-tint/60 ring-1 ring-acc' : 'border-line hover:border-line-2')}>
                  <div className="min-w-0 flex-1">
                    <div className="text-[16px] font-medium">{x.name}</div>
                    <div className="mt-0.5 text-[13.5px] text-ink-2">{f.dur(x.dur)}</div>
                    {x.desc && <div className="mt-1 text-[13.5px] text-ink-3">{x.desc}</div>}
                    <div className="mt-1.5 font-semibold">{f.price(x)}</div>
                  </div>
                  <span className={cls('flex size-8 flex-none items-center justify-center rounded-full border transition-colors', on ? 'border-acc bg-acc text-white' : 'border-line-2 text-ink-2')}>
                    {on ? <Check size={17} strokeWidth={2.5} /> : <Plus size={17} strokeWidth={2} />}
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      ))}
    </>
  )
}

function MasterStep({ s, d, choose }: { s: SalonDetail; d: Draft; choose: (id: string) => void }) {
  const t = useTranslations('booking')
  const f = useFmt()
  const tc = useTranslations('common')
  const list = s.staff.filter((st) => d.svc.every((id) => st.services.includes(id)))
  return (
    <>
      <h1 className="text-[28px] font-bold tracking-[-0.03em] md:text-[34px]">{t('titleMaster')}</h1>
      <p className="mt-1 text-[15px] text-ink-2">{d.svc.length > 1 ? t('subMasterMany') : t('subMasterOne')}</p>
      <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
        {list.length > 1 && (
          <button type="button" onClick={() => choose('any')} className={cls('flex items-center gap-4 rounded-card border p-4 text-left hover:border-line-2', d.staff === 'any' ? 'border-acc ring-1 ring-acc' : 'border-line')}>
            <span className="flex size-14 flex-none items-center justify-center rounded-full bg-acc-tint text-acc">
              <Shuffle size={24} strokeWidth={1.75} />
            </span>
            <span>
              <span className="block text-[16px] font-semibold">{t('anyMaster')}</span>
              <span className="block text-[13.5px] text-ink-2">{t('anyMasterSub')}</span>
            </span>
          </button>
        )}
        {list.map((st) => (
          <button key={st.id} type="button" onClick={() => choose(st.id)} className={cls('flex items-center gap-4 rounded-card border p-4 text-left hover:border-line-2', d.staff === st.id ? 'border-acc ring-1 ring-acc' : 'border-line')}>
            <span className="relative">
              <Avatar name={st.name} size={56} acc />
            </span>
            <span className="min-w-0">
              <span className="block text-[16px] font-semibold">{st.name}</span>
              <span className="block truncate text-[13.5px] text-ink-2">{st.spec}</span>
              <span className="mt-0.5 block text-[13px]">
                <b>★ {f.rating(st.rating)}</b> <span className="text-ink-3">· {tc('visits', { count: st.visits })}</span>
              </span>
            </span>
          </button>
        ))}
      </div>
      {!list.length && <Note className="mt-4" icon={<Info size={17} />}>{t('noMasterForAll')}</Note>}
    </>
  )
}

function TimeStep({ s, d, set, staffList }: { s: SalonDetail; d: Draft; set: (p: Partial<Draft>) => void; staffList: StaffPublic[] }) {
  const t = useTranslations('booking')
  const tc = useTranslations('common')
  const f = useFmt()
  const staffId = d.staff && d.staff !== 'any' ? d.staff : undefined
  const window = s.windowDays
  const { data: days } = useDays({ salonId: s.id, serviceIds: d.svc, staffId, from: today(), days: window + 1, excludeBookingId: d.replace })
  const date = d.date ?? days?.find((x) => x.count > 0)?.date
  const { data: day, isFetching } = useDay(date ? { salonId: s.id, serviceIds: d.svc, staffId, date, excludeBookingId: d.replace } : null)
  const strip = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!d.date && date) set({ date })
  }, [date]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    strip.current?.querySelector('[data-on="true"]')?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [days === undefined]) // eslint-disable-line react-hooks/exhaustive-deps

  const slots = day && day.date === date ? day.slots : []
  const groups = [
    { name: t('morning'), items: slots.filter((x) => x.start < 12 * 60) },
    { name: t('day'), items: slots.filter((x) => x.start >= 12 * 60 && x.start < 17 * 60) },
    { name: t('evening'), items: slots.filter((x) => x.start >= 17 * 60) },
  ].filter((g) => g.items.length)
  const nextDay = days?.find((x) => date && x.date > date && x.count > 0)
  const picked = slots.find((x) => x.start === d.time)
  const free = picked ? staffList.filter((st) => picked.staff.includes(st.id)) : []
  const closedLabel = (r: string | null) => (!r ? '' : r === 'dayoff' ? (staffId ? t('masterOff') : t('salonClosed')) : r === 'salon-closed' ? t('salonClosed') : t('closedReason', { reason: r }))

  return (
    <>
      <h1 className="text-[28px] font-bold tracking-[-0.03em] md:text-[34px]">{d.replace ? t('titleReschedule') : t('titleTime')}</h1>

      {/* master switcher */}
      {!d.replace && (
        <div className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          {staffList.length > 1 && (
            <button type="button" onClick={() => set({ staff: 'any', time: undefined, who: undefined })} className={cls('flex h-10 flex-none items-center gap-2 rounded-full border pl-1.5 pr-4 text-[14px]', d.staff === 'any' ? 'border-ink bg-ink font-semibold text-white' : 'border-line hover:bg-group-2')}>
              <span className={cls('flex size-7 items-center justify-center rounded-full', d.staff === 'any' ? 'bg-white/15' : 'bg-acc-tint text-acc')}><Shuffle size={15} /></span>
              {t('anyMaster')}
            </button>
          )}
          {staffList.map((st) => (
            <button key={st.id} type="button" onClick={() => set({ staff: st.id, time: undefined, who: undefined })} className={cls('flex h-10 flex-none items-center gap-2 rounded-full border pl-1.5 pr-4 text-[14px]', d.staff === st.id ? 'border-ink bg-ink font-semibold text-white' : 'border-line hover:bg-group-2')}>
              <Avatar name={st.name} size={28} acc />
              {st.name}
            </button>
          ))}
        </div>
      )}

      {/* days */}
      <div className="mt-6 flex items-center justify-between">
        <div className="text-[17px] font-semibold">{date ? f.monthYear(date) : ''}</div>
        <div className="hidden gap-1.5 md:flex">
          <button type="button" aria-label={tc('back')} onClick={() => strip.current?.scrollBy({ left: -400, behavior: 'smooth' })} className="flex size-9 items-center justify-center rounded-full border border-line hover:bg-group-2"><ChevronLeft size={18} /></button>
          <button type="button" aria-label={tc('continue')} onClick={() => strip.current?.scrollBy({ left: 400, behavior: 'smooth' })} className="flex size-9 items-center justify-center rounded-full border border-line hover:bg-group-2"><ChevronRight size={18} /></button>
        </div>
      </div>
      <div ref={strip} className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {!days && Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-[76px] w-[60px] flex-none rounded-2xl" />)}
        {days?.map((x) => {
          const on = x.date === date
          const off = !!x.closed
          return (
            <button
              key={x.date}
              data-on={on}
              type="button"
              disabled={off}
              onClick={() => set({ date: x.date, time: undefined, who: undefined })}
              className={cls('relative flex h-[76px] w-[60px] flex-none flex-col items-center justify-center gap-0.5 rounded-2xl border transition-colors', on ? 'border-acc bg-acc text-white' : off ? 'border-transparent bg-group text-ink-4' : 'border-line hover:border-line-2')}
            >
              <span className={cls('text-[12px]', on ? 'text-white/80' : off ? '' : 'text-ink-3')}>{f.weekdayShort(x.date)}</span>
              <span className="text-[20px] font-semibold tabular leading-none">{Number(x.date.slice(8))}</span>
              <span className={cls('mt-1 size-1.5 rounded-full', on ? 'bg-white' : x.count ? 'bg-green' : 'bg-transparent')} />
            </button>
          )
        })}
      </div>

      {/* times */}
      <div className={cls('mt-6 min-h-[200px] transition-opacity', isFetching && 'opacity-60')}>
        {date && <div className="text-[17px] font-semibold">{f.longDay(date)}</div>}
        {!day && <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6">{Array.from({ length: 12 }, (_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>}
        {day && day.date === date && !slots.length && (
          <div className="mt-4 flex flex-col items-center gap-2 rounded-card border border-dashed border-line-2 px-6 py-10 text-center">
            <CalendarDays size={28} strokeWidth={1.5} className="text-acc" />
            <div className="text-[17px] font-semibold">{day.closed ? closedLabel(day.closed) : t('allBusy')}</div>
            {nextDay && (
              <Button variant="soft" className="mt-2" onClick={() => set({ date: nextDay.date, time: undefined })}>
                {t('nearestFree', { when: f.relDay(nextDay.date) ?? f.dayMonth(nextDay.date) })}
              </Button>
            )}
          </div>
        )}
        {groups.map((g) => (
          <div key={g.name} className="mt-5">
            <div className="mb-2 flex justify-between text-[13px] font-semibold text-ink-3">
              <span>{g.name}</span>
              <span>{tc('windows', { count: g.items.length })}</span>
            </div>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {g.items.map((x) => {
                const on = d.time === x.start
                return (
                  <button key={x.start} type="button" onClick={() => set({ time: x.start, who: undefined })} className={cls('flex h-12 flex-col items-center justify-center rounded-xl border text-[15px] font-medium leading-tight tabular transition-colors', on ? 'border-acc bg-acc font-semibold text-white' : 'border-line hover:border-acc-line hover:bg-acc-tint/50')}>
                    {hm(x.start)}
                    {d.staff === 'any' && <small className={cls('text-[10.5px] font-medium', on ? 'text-white/80' : 'text-ink-3')}>{tc('masters', { count: x.staff.length })}</small>}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* «any master» path: who is free at the picked time */}
      {d.staff === 'any' && picked && free.length > 0 && (
        <div className="mt-8 rounded-card bg-group p-4">
          <div className="text-[15px] font-semibold">{t('whoFree', { time: hm(picked.start) })}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {free.length > 1 && (
              <button type="button" onClick={() => set({ who: undefined })} className={cls('flex h-11 items-center gap-2 rounded-full border bg-white pl-1.5 pr-4 text-[14px]', !d.who ? 'border-acc font-semibold ring-1 ring-acc' : 'border-line')}>
                <span className="flex size-8 items-center justify-center rounded-full bg-acc-tint text-acc"><Shuffle size={15} /></span>
                {t('anyOfThem')}
              </button>
            )}
            {free.map((st) => (
              <button key={st.id} type="button" onClick={() => set({ who: st.id })} className={cls('flex h-11 items-center gap-2 rounded-full border bg-white pl-1.5 pr-4 text-[14px]', d.who === st.id || (free.length === 1 && !d.who) ? 'border-acc font-semibold ring-1 ring-acc' : 'border-line')}>
                <Avatar name={st.name} size={32} acc />
                {st.name} <span className="text-ink-3">★ {f.rating(st.rating)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

function ConfirmStep({ s, d, staff, comment, setComment, taken, onPickAlt }: { s: SalonDetail; d: Draft; staff?: StaffPublic; comment: string; setComment: (v: string) => void; taken: number[] | null; onPickAlt: (m: number) => void }) {
  const t = useTranslations('booking')
  const ta = useTranslations('auth')
  const tsalon = useTranslations('salon')
  const f = useFmt()
  const { data: session, isPending } = useSession()
  const svcs = d.svc.map((id) => s.menu.find((x) => x.id === id)!).filter(Boolean)
  const dur = svcs.reduce((a, x) => a + x.dur, 0)
  const price = svcs.reduce((a, x) => a + x.price, 0)
  const row = 'flex items-center gap-3 border-b border-row py-3 last:border-0'
  return (
    <>
      <h1 className="text-[28px] font-bold tracking-[-0.03em] md:text-[34px]">{d.replace ? t('titleConfirmReschedule') : s.instant ? t('titleConfirmInstant') : t('titleConfirm')}</h1>

      {taken && (
        <div className="mt-5 rounded-card bg-amber-tint p-4">
          <div className="font-semibold text-amber-ink">{t('takenTitle', { time: hm(d.time!) })}</div>
          <div className="mt-1 text-[14px] text-[#7a4308]">{taken.length ? t('takenText') : t('takenNone')}</div>
          {taken.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {taken.map((m) => (
                <button key={m} type="button" onClick={() => onPickAlt(m)} className="h-10 rounded-xl border border-amber-line bg-white px-4 font-semibold tabular hover:bg-amber-tint">{hm(m)}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {!isPending && !session && (
        <div className="mt-6 rounded-[20px] border border-line p-5 md:p-6">
          <div className="text-[18px] font-semibold">{t('loginTitle')}</div>
          <div className="mb-4 mt-1 text-[14px] text-ink-2">{t('loginText')}</div>
          <div className="max-w-[400px]">
            <PhoneAuth compact onDone={() => {}} />
          </div>
        </div>
      )}

      <div className="mt-6 rounded-card border border-line px-4">
        <div className="pt-3 text-[12px] font-semibold uppercase tracking-[0.07em] text-ink-3">{t('whereWhen')}</div>
        <div className={row}>
          <img src={s.photos[0]} alt="" className="size-10 rounded-[10px] object-cover" />
          <div><div className="font-medium">{s.name}</div><div className="text-[13.5px] text-ink-2">{s.address}, {s.district}</div></div>
        </div>
        <div className={row}>
          <span className="flex size-10 items-center justify-center rounded-[10px] bg-acc-tint text-acc"><CalendarDays size={19} strokeWidth={1.75} /></span>
          <div><div className="font-medium">{f.longDay(d.date!)}</div><div className="text-[13.5px] text-ink-2">{hm(d.time!)} – {hm(d.time! + dur)} · {f.dur(dur)}</div></div>
        </div>
        <div className={row}>
          <Avatar name={staff?.name ?? '?'} size={40} acc />
          <div><div className="font-medium">{staff?.name}</div><div className="text-[13.5px] text-ink-2">{staff?.spec}</div></div>
        </div>
      </div>

      <div className="mt-4 rounded-card border border-line px-4">
        {svcs.map((x) => (
          <div key={x.id} className="flex justify-between gap-3 border-b border-row py-3">
            <div><div className="font-medium">{x.name}</div><div className="text-[13.5px] text-ink-2">{f.dur(x.dur)}</div></div>
            <div className="font-medium">{f.price(x)}</div>
          </div>
        ))}
        <div className="flex justify-between py-3 font-semibold">
          <span>{t('servicesTotal')}</span>
          <span>{svcs.some((x) => x.priceFrom) ? f.price({ price, priceFrom: true }) : f.money(price)}</span>
        </div>
      </div>

      {!d.replace && (
        <div className="mt-4">
          <label htmlFor="comment" className="mb-2 flex items-center gap-2 text-[15px] font-medium"><MessageSquare size={17} strokeWidth={1.75} className="text-ink-3" />{t('comment')}</label>
          <textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('commentPlaceholder')} rows={3} className="w-full resize-none rounded-input border border-line-2 px-4 py-3 text-[15px] outline-none focus:border-acc focus:shadow-[0_0_0_3px_rgb(90_63_240/0.12)]" />
          <div className="mt-1 text-[13px] text-ink-3">{t('commentHint')}</div>
        </div>
      )}

      <Note className="mt-5">{s.instant ? t('instantFoot') : t('manualFoot')} {tsalon('cancelPolicy', { hours: s.cancelHours })}</Note>
      {!session && !isPending && <div className="mt-3 text-[12.5px] text-ink-3">{ta('terms')}</div>}
    </>
  )
}

/* ───────────── the flow ───────────── */

export function BookingFlow({ s }: { s: SalonDetail }) {
  const t = useTranslations('booking')
  const tc = useTranslations('common')
  const router = useRouter()
  const sp = useSearchParams()
  // unknown service/master ids (old or edited links) are dropped instead of breaking the flow
  const d = useMemo(() => {
    const x = read(new URLSearchParams(sp.toString()))
    x.svc = x.svc.filter((id) => s.menu.some((m) => m.id === id))
    if (x.staff && x.staff !== 'any' && !s.staff.some((m) => m.id === x.staff)) x.staff = null
    if (!x.svc.length && !x.replace && x.step !== 'services') x.step = 'services'
    return x
  }, [sp, s])
  const { data: session } = useSession()
  const { data: moving } = useBooking(d.replace ?? '')
  const create = useCreateBooking()
  const [comment, setComment] = useState('')
  const [taken, setTaken] = useState<number[] | null>(null)
  // came from a master on the salon page: services are filtered to theirs and the master step is skipped
  const [fixedFromLink] = useState(() => !!sp.get('staff') && !sp.get('step'))
  const go = (p: Partial<Draft>) => window.history.pushState(null, '', href(s.slug, { ...d, ...p }))
  const replace = (p: Partial<Draft>) => window.history.replaceState(null, '', href(s.slug, { ...d, ...p }))

  // a reschedule starts from the existing booking
  useEffect(() => {
    if (moving && d.replace && !d.svc.length) replace({ svc: moving.services.map((x) => x.id), staff: moving.staffId, step: 'time' })
  }, [moving]) // eslint-disable-line react-hooks/exhaustive-deps
  // chips on search cards: service + date + time → straight to the time step with that slot picked
  useEffect(() => {
    if (!sp.get('step') && d.svc.length && d.date && d.time !== undefined) replace({ step: 'time', staff: 'any' })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const staffFor = s.staff.filter((st) => d.svc.every((id) => st.services.includes(id)))
  const fixed = fixedFromLink && d.staff && d.staff !== 'any' ? s.staff.find((x) => x.id === d.staff) : undefined
  const effectiveStaffId = d.staff && d.staff !== 'any' ? d.staff : d.who
  const { data: day } = useDay(d.staff === 'any' && d.date && d.svc.length ? { salonId: s.id, serviceIds: d.svc, date: d.date } : null)
  const anyPick = d.staff === 'any' && d.time !== undefined ? (d.who ?? day?.slots.find((x) => x.start === d.time)?.staff.map((id) => s.staff.find((st) => st.id === id)!).sort((a, b) => b.rating - a.rating)[0]?.id) : undefined
  const assigned = s.staff.find((x) => x.id === (effectiveStaffId ?? anyPick))
  const skipMaster = staffFor.length <= 1

  const reachable = (x: Step) =>
    x === 'services' ? !d.replace : x === 'master' ? d.svc.length > 0 && !d.replace : x === 'time' ? d.svc.length > 0 && !!d.staff : !!(d.date && d.time !== undefined && assigned)

  const next = async () => {
    if (d.step === 'services') {
      if (fixed) return go({ step: 'time' })
      if (skipMaster) return go({ step: 'time', staff: staffFor[0]?.id ?? 'any' })
      return go({ step: 'master' })
    }
    if (d.step === 'master') return go({ step: 'time' })
    if (d.step === 'time') return go({ step: 'confirm', who: d.staff === 'any' ? assigned?.id : d.who })
    // confirm
    let channel: 'direct' | 'marketplace' = 'marketplace'
    try {
      if (sessionStorage.getItem(`yeral:ch:${s.slug}`) === 'direct') channel = 'direct'
    } catch {}
    const r = await create.mutateAsync({ salonId: s.id, staffId: assigned!.id, serviceIds: d.svc, date: d.date!, start: d.time!, comment: comment.trim() || undefined, channel, replaceId: d.replace })
    if (r.ok) router.replace(`/account/bookings/${r.id}?new=1`)
    else if (r.reason === 'taken') setTaken(r.alternatives)
  }

  const cta = d.step === 'confirm' ? (d.replace ? t('submitReschedule') : s.instant ? t('submitInstant') : t('submitRequest')) : tc('continue')
  const disabled =
    d.step === 'services' ? !d.svc.length : d.step === 'master' ? !d.staff : d.step === 'time' ? !(d.date && d.time !== undefined && assigned) : !session || !assigned || !d.date || d.time === undefined
  const back = () => {
    const i = STEPS.indexOf(d.step)
    if (i <= 0 || (d.replace && d.step === 'time')) router.push(d.replace ? `/account/bookings/${d.replace}` : `/${s.slug}`)
    else router.back()
  }

  if (!s.online)
    return (
      <div className="mx-auto max-w-[560px] px-4 py-20 text-center">
        <Note tone="amber">{t('noOnline')}</Note>
        <Link href={`/${s.slug}`} className="mt-6 inline-block font-semibold text-acc-ink">{s.name}</Link>
      </div>
    )

  return (
    <div className="min-h-dvh pb-32 lg:pb-16">
      <header className="sticky top-0 z-20 border-b border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center gap-3 px-4 md:px-6">
          <button type="button" onClick={back} aria-label={tc('back')} className="flex size-10 items-center justify-center rounded-full border border-line hover:bg-group-2">
            <ArrowLeft size={20} strokeWidth={1.75} />
          </button>
          <div className="hidden min-w-0 flex-1 justify-center md:flex">
            <Crumbs step={d.step} reachable={reachable} onGo={(x) => go({ step: x })} skipMaster={skipMaster || !!fixed} />
          </div>
          <div className="min-w-0 flex-1 truncate text-center text-[15px] font-semibold md:hidden">{s.name}</div>
          <Link href={d.replace ? `/account/bookings/${d.replace}` : `/${s.slug}`} aria-label={t('exit')} className="flex size-10 items-center justify-center rounded-full border border-line hover:bg-group-2">
            <X size={20} strokeWidth={1.75} />
          </Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-[1180px] gap-10 px-4 pt-6 md:px-6 md:pt-10 lg:grid-cols-[1fr_360px]">
        <main className="min-w-0">
          {d.step === 'services' && <ServicesStep s={s} d={d} set={replace} fixed={fixed} />}
          {d.step === 'master' && <MasterStep s={s} d={d} choose={(id) => go({ staff: id, step: 'time', time: undefined, who: undefined })} />}
          {d.step === 'time' && d.svc.length > 0 && <TimeStep s={s} d={d} set={replace} staffList={staffFor} />}
          {d.step === 'confirm' && d.date && d.time !== undefined && (
            <ConfirmStep s={s} d={d} staff={assigned} comment={comment} setComment={setComment} taken={taken} onPickAlt={(m) => { setTaken(null); replace({ time: m }) }} />
          )}
        </main>
        <aside>
          <Summary s={s} d={d} staff={d.step === 'services' ? undefined : assigned ?? (d.staff && d.staff !== 'any' ? s.staff.find((x) => x.id === d.staff) : undefined)} cta={cta} disabled={disabled} onNext={next} busy={create.isPending} />
        </aside>
      </div>
    </div>
  )
}

export function Fallback({ children }: { children?: ReactNode }) {
  return <div className="mx-auto max-w-[1180px] px-6 py-16">{children ?? <Skeleton className="h-10 w-72" />}</div>
}

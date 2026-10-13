'use client'

import { CalendarDays, Clock, MapPin, Search, Sparkles, X } from 'lucide-react'
import { Popover } from 'radix-ui'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useRef, useState, type ReactNode } from 'react'
import { useSuggest } from '@/api/hooks'
import { DISTRICTS } from '@/domain/places'
import type { CategoryId } from '@/domain/types'
import { addDays, cls, today } from '@/domain/time'
import { useFmt } from '@/lib/format'
import { CATEGORY_ORDER, CategoryIcon } from './category-icon'

export type SearchState = { q?: string; category?: CategoryId; district?: string; date?: string }

export function searchHref(s: SearchState) {
  const p = new URLSearchParams()
  if (s.q) p.set('q', s.q)
  if (s.category) p.set('category', s.category)
  if (s.district) p.set('district', s.district)
  if (s.date) p.set('date', s.date)
  const qs = p.toString()
  return `/search${qs ? `?${qs}` : ''}`
}

function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Popover.Portal>
      <Popover.Content
        align="start"
        sideOffset={10}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className={cls('z-40 max-h-[min(460px,70dvh)] w-[min(400px,calc(100vw-32px))] animate-pop-in overflow-y-auto rounded-[18px] border border-line bg-white p-2 shadow-pop', className)}
      >
        {children}
      </Popover.Content>
    </Popover.Portal>
  )
}

function Row({ icon, title, sub, onPick, on }: { icon: ReactNode; title: ReactNode; sub?: ReactNode; onPick: () => void; on?: boolean }) {
  return (
    <button type="button" onClick={onPick} className={cls('flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left hover:bg-group', on && 'bg-acc-tint')}>
      <span className={cls('flex size-10 flex-none items-center justify-center rounded-xl', on ? 'bg-white text-acc' : 'bg-group text-ink-2')}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium">{title}</span>
        {sub && <span className="block truncate text-[13px] text-ink-2">{sub}</span>}
      </span>
    </button>
  )
}

/** What: free text, category or a salon straight away. */
function WhatPanel({ q, onCategory, onService, onSalon }: { q: string; onCategory: (c: CategoryId) => void; onService: (n: string) => void; onSalon: (slug: string) => void }) {
  const t = useTranslations()
  const { data } = useSuggest(q)
  if (!q.trim())
    return (
      <>
        <div className="px-2.5 pb-1 pt-2 text-[12px] font-semibold uppercase tracking-[0.07em] text-ink-3">{t('searchBar.categories')}</div>
        {CATEGORY_ORDER.map((c) => (
          <Row key={c} icon={<CategoryIcon id={c} size={20} />} title={t(`categories.${c}`)} onPick={() => onCategory(c)} />
        ))}
      </>
    )
  const nothing = data && !data.services.length && !data.salons.length
  return (
    <>
      {nothing && <div className="px-3 py-6 text-center text-[14px] text-ink-2">{t('searchBar.nothing', { q })}</div>}
      {!!data?.services.length && <div className="px-2.5 pb-1 pt-2 text-[12px] font-semibold uppercase tracking-[0.07em] text-ink-3">{t('searchBar.services')}</div>}
      {data?.services.map((s) => (
        <Row key={s.name} icon={<Sparkles size={18} strokeWidth={1.75} />} title={s.name} sub={t('common.salons', { count: s.salons })} onPick={() => onService(s.name)} />
      ))}
      {!!data?.salons.length && <div className="px-2.5 pb-1 pt-2 text-[12px] font-semibold uppercase tracking-[0.07em] text-ink-3">{t('searchBar.salons')}</div>}
      {data?.salons.map((s) => (
        <Row key={s.id} icon={<img src={s.photos[0]} alt="" className="size-10 rounded-xl object-cover" />} title={s.name} sub={`${s.kind} · ${s.district}`} onPick={() => onSalon(s.slug)} />
      ))}
    </>
  )
}

function WherePanel({ value, onPick }: { value?: string; onPick: (id?: string) => void }) {
  const t = useTranslations('searchBar')
  return (
    <>
      <Row icon={<MapPin size={18} strokeWidth={1.75} />} title={t('allCity')} on={!value} onPick={() => onPick(undefined)} />
      <div className="px-2.5 pb-1 pt-2 text-[12px] font-semibold uppercase tracking-[0.07em] text-ink-3">{t('districts')}</div>
      {DISTRICTS.map((d) => (
        <Row key={d.id} icon={<MapPin size={18} strokeWidth={1.75} />} title={d.name} on={value === d.id} onPick={() => onPick(d.id)} />
      ))}
    </>
  )
}

function WhenPanel({ value, onPick }: { value?: string; onPick: (d?: string) => void }) {
  const t = useTranslations('common')
  const f = useFmt()
  const days = Array.from({ length: 14 }, (_, i) => addDays(today(), i))
  return (
    <div className="p-1">
      <button type="button" onClick={() => onPick(undefined)} className={cls('mb-2 flex h-11 w-full items-center gap-2 rounded-xl px-3 text-[15px] font-medium hover:bg-group', !value && 'bg-acc-tint text-acc-ink')}>
        <Clock size={18} strokeWidth={1.75} />
        {t('anyDay')}
      </button>
      <div className="grid grid-cols-4 gap-1.5">
        {days.map((d, i) => (
          <button
            key={d}
            type="button"
            onClick={() => onPick(d)}
            className={cls('flex h-14 flex-col items-center justify-center rounded-xl border text-[13px] leading-tight transition-colors', value === d ? 'border-acc bg-acc font-semibold text-white' : 'border-line hover:border-line-2 hover:bg-group-2')}
          >
            <span className={cls('text-[11.5px]', value === d ? 'text-white/80' : 'text-ink-3')}>{i === 0 ? t('today') : i === 1 ? t('tomorrow') : f.weekdayShort(d)}</span>
            <span className="tabular font-semibold">{f.dayMonthShort(d)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function SearchBar({ initial = {}, className }: { initial?: SearchState; className?: string }) {
  const t = useTranslations()
  const f = useFmt()
  const router = useRouter()
  const [s, setS] = useState<SearchState>(initial)
  const [text, setText] = useState(initial.q ?? (initial.category ? t(`categories.${initial.category}`) : ''))
  const [open, setOpen] = useState<'what' | 'where' | 'when' | null>(null)
  const whatRef = useRef<HTMLInputElement>(null)

  const go = (next: SearchState = s) => {
    setOpen(null)
    router.push(searchHref(next))
  }
  const dateLabel = s.date ? (f.relDay(s.date) ?? `${f.weekdayShort(s.date)}, ${f.dayMonthShort(s.date)}`) : ''
  const seg = 'flex min-w-0 flex-1 items-center gap-3 rounded-full px-5 text-left transition-colors hover:bg-group-2 data-[state=open]:bg-white data-[state=open]:shadow-pop'

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        go()
      }}
      className={cls('flex flex-col gap-1 rounded-[20px] border border-line bg-white p-2 shadow-[0_8px_30px_rgb(16_16_20/0.08)] md:h-[68px] md:flex-row md:items-stretch md:gap-0 md:rounded-full', className)}
    >
      <Popover.Root open={open === 'what'} onOpenChange={(v) => setOpen(v ? 'what' : null)}>
        <Popover.Anchor asChild>
          <label className={cls(seg, 'h-14 cursor-text md:h-auto md:flex-[1.4]')} data-state={open === 'what' ? 'open' : 'closed'}>
            <Search size={20} strokeWidth={1.75} className="text-ink-2" />
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-semibold text-ink-2">{t('searchBar.what')}</span>
              <input
                ref={whatRef}
                value={text}
                onChange={(e) => {
                  setText(e.target.value)
                  setS((x) => ({ ...x, q: e.target.value || undefined, category: undefined }))
                  setOpen('what')
                }}
                onFocus={() => setOpen('what')}
                placeholder={t('searchBar.whatPlaceholder')}
                className="w-full bg-transparent text-[15px] font-medium outline-none placeholder:font-normal placeholder:text-ink-3"
                autoComplete="off"
                enterKeyHint="search"
              />
            </span>
            {text && (
              <button type="button" aria-label={t('common.close')} className="rounded-full p-1 text-ink-3 hover:bg-group" onClick={() => { setText(''); setS((x) => ({ ...x, q: undefined, category: undefined })); whatRef.current?.focus() }}>
                <X size={16} />
              </button>
            )}
          </label>
        </Popover.Anchor>
        <Panel>
          <WhatPanel
            q={s.q ?? ''}
            onCategory={(c) => { setS((x) => ({ ...x, category: c, q: undefined })); setText(t(`categories.${c}`)); setOpen('where') }}
            onService={(n) => { setS((x) => ({ ...x, q: n, category: undefined })); setText(n); setOpen('where') }}
            onSalon={(slug) => { setOpen(null); router.push(`/${slug}`) }}
          />
        </Panel>
      </Popover.Root>

      <span className="mx-1 hidden w-px self-center bg-line md:block md:h-8" />
      <Popover.Root open={open === 'where'} onOpenChange={(v) => setOpen(v ? 'where' : null)}>
        <Popover.Trigger asChild>
          <button type="button" className={cls(seg, 'h-14 md:h-auto')}>
            <MapPin size={20} strokeWidth={1.75} className="text-ink-2" />
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-semibold text-ink-2">{t('searchBar.where')}</span>
              <span className={cls('block truncate text-[15px]', s.district ? 'font-medium' : 'text-ink-3')}>{s.district ? DISTRICTS.find((d) => d.id === s.district)?.name : t('searchBar.wherePlaceholder')}</span>
            </span>
          </button>
        </Popover.Trigger>
        <Panel className="w-[min(320px,calc(100vw-32px))]">
          <WherePanel value={s.district} onPick={(id) => { setS((x) => ({ ...x, district: id })); setOpen('when') }} />
        </Panel>
      </Popover.Root>

      <span className="mx-1 hidden w-px self-center bg-line md:block md:h-8" />
      <Popover.Root open={open === 'when'} onOpenChange={(v) => setOpen(v ? 'when' : null)}>
        <Popover.Trigger asChild>
          <button type="button" className={cls(seg, 'h-14 md:h-auto')}>
            <CalendarDays size={20} strokeWidth={1.75} className="text-ink-2" />
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-semibold text-ink-2">{t('searchBar.when')}</span>
              <span className={cls('block truncate text-[15px]', s.date ? 'font-medium' : 'text-ink-3')}>{dateLabel || t('searchBar.whenPlaceholder')}</span>
            </span>
          </button>
        </Popover.Trigger>
        <Panel className="w-[min(360px,calc(100vw-32px))]">
          <WhenPanel value={s.date} onPick={(d) => { const next = { ...s, date: d }; setS(next); setOpen(null) }} />
        </Panel>
      </Popover.Root>

      <button type="submit" className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-[16px] font-semibold text-white shadow-[var(--shadow-btn)] [background:var(--grad)] hover:[background:var(--grad-hover)] md:m-0 md:h-auto">
        <Search size={18} strokeWidth={2} />
        {t('searchBar.submit')}
      </button>
    </form>
  )
}

/** Header version: one field with suggestions. */
export function CompactSearch({ className }: { className?: string }) {
  const t = useTranslations()
  const router = useRouter()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Anchor asChild>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setOpen(false)
            router.push(searchHref({ q: q.trim() || undefined }))
          }}
          className={cls('flex h-11 items-center gap-2 rounded-full border border-line bg-white pl-4 pr-1.5 transition-shadow focus-within:border-line-2 focus-within:shadow-pop', className)}
        >
          <Search size={18} strokeWidth={1.75} className="text-ink-2" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder={t('header.searchPlaceholder')}
            className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-ink-3"
            autoComplete="off"
            enterKeyHint="search"
          />
          <button type="submit" aria-label={t('searchBar.submit')} className="flex size-8 items-center justify-center rounded-full bg-ink text-white">
            <Search size={15} strokeWidth={2.25} />
          </button>
        </form>
      </Popover.Anchor>
      <Panel>
        <WhatPanel
          q={q}
          onCategory={(c) => { setOpen(false); router.push(searchHref({ category: c })) }}
          onService={(n) => { setOpen(false); setQ(n); router.push(searchHref({ q: n })) }}
          onSalon={(slug) => { setOpen(false); router.push(`/${slug}`) }}
        />
      </Panel>
    </Popover.Root>
  )
}

'use client'

import { ChevronLeft, ChevronRight, Clock, Grid2x2, MessageSquareText, Navigation, Phone, Share, Zap } from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'
import type { ReviewPublic, SalonDetail } from '@/api'
import { useNextFree, useReviews } from '@/api/hooks'
import { openState } from '@/domain/logic'
import { addDays, cls, dow, today } from '@/domain/time'
import { useFmt } from '@/lib/format'
import { directionsUrl } from '@/lib/links'
import { FavoriteButton } from '@/components/site/salon-card'
import { Avatar, Note, Stars } from '@/components/ui/bits'
import { Button, ButtonLink } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'

const SalonMap = dynamic(() => import('@/components/site/salon-map').then((m) => m.SalonMap), { ssr: false, loading: () => <div className="size-full animate-skel bg-group" /> })

/** Remember that the visitor came straight to the salon's link (no commission) vs from the catalogue. */
export function ChannelMarker({ slug }: { slug: string }) {
  useEffect(() => {
    try {
      const fromCatalog = sessionStorage.getItem('yeral:browsed') === '1'
      if (!fromCatalog && !sessionStorage.getItem(`yeral:ch:${slug}`)) sessionStorage.setItem(`yeral:ch:${slug}`, 'direct')
    } catch {}
  }, [slug])
  return null
}

/** Any catalogue page marks the session as «browsing Yeral». */
export function CatalogMarker() {
  useEffect(() => {
    try {
      sessionStorage.setItem('yeral:browsed', '1')
    } catch {}
  }, [])
  return null
}

export function HeaderActions({ s }: { s: SalonDetail }) {
  const t = useTranslations('common')
  const toast = useToast()
  return (
    <div className="flex flex-none items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        pill
        icon={<Share size={16} strokeWidth={1.75} />}
        onClick={async () => {
          const url = `${location.origin}/${s.slug}`
          if (navigator.share) {
            try {
              await navigator.share({ title: s.name, url })
              return
            } catch {}
          }
          await navigator.clipboard?.writeText(url).catch(() => {})
          toast(t('linkCopied'))
        }}
      >
        <span className="hidden sm:inline">{t('share')}</span>
      </Button>
      <FavoriteButton salonId={s.id} className="size-9 border border-line-2 text-ink hover:bg-group-2" />
    </div>
  )
}

export function OpenNow({ s, className }: { s: Pick<SalonDetail, 'hours' | 'exceptions'>; className?: string }) {
  const f = useFmt()
  const st = openState(s)
  return (
    <span suppressHydrationWarning className={cls(st.open ? 'text-green-ink' : 'text-ink-3', 'font-medium', className)}>
      {f.open(st)}
    </span>
  )
}

export function Gallery({ s }: { s: SalonDetail }) {
  const t = useTranslations('salon')
  const [open, setOpen] = useState<number | null>(null)
  const ph = s.photos
  return (
    <>
      {/* phone: swipe carousel */}
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory overflow-x-auto md:hidden">
        {ph.map((p, i) => (
          <button key={p} type="button" className="relative aspect-[4/3] w-full flex-none snap-start" onClick={() => setOpen(i)}>
            <img src={p} alt={i === 0 ? s.name : ''} className="size-full object-cover" />
            <span className="absolute bottom-3 right-3 rounded-lg bg-ink/60 px-2 py-0.5 text-[12px] text-white">{i + 1} / {ph.length}</span>
          </button>
        ))}
      </div>
      {/* desktop: mosaic */}
      <div className="relative hidden h-[440px] grid-cols-[2fr_1fr] gap-2 overflow-hidden rounded-[20px] md:grid">
        <button type="button" onClick={() => setOpen(0)} className="overflow-hidden">
          <img src={ph[0]} alt={s.name} className="size-full object-cover transition-transform duration-300 hover:scale-[1.02]" />
        </button>
        <div className="grid grid-rows-2 gap-2">
          {ph.slice(1, 3).map((p, i) => (
            <button key={p} type="button" onClick={() => setOpen(i + 1)} className="overflow-hidden">
              <img src={p} alt="" className="size-full object-cover transition-transform duration-300 hover:scale-[1.02]" />
            </button>
          ))}
        </div>
        <Button variant="white" size="sm" className="absolute bottom-4 right-4" icon={<Grid2x2 size={16} strokeWidth={1.75} />} onClick={() => setOpen(0)}>
          {t('allPhotos')} · {ph.length}
        </Button>
      </div>
      <Dialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)} title={`${s.name} · ${t('photos')}`} size="xl">
        {open !== null && (
          <div className="relative">
            <img src={ph[open]} alt="" className="max-h-[70dvh] w-full rounded-xl object-contain" />
            <button type="button" aria-label="Назад" disabled={open === 0} onClick={() => setOpen(open - 1)} className="absolute left-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 shadow disabled:opacity-0">
              <ChevronLeft size={20} />
            </button>
            <button type="button" aria-label="Вперёд" disabled={open === ph.length - 1} onClick={() => setOpen(open + 1)} className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 shadow disabled:opacity-0">
              <ChevronRight size={20} />
            </button>
            <div className="mt-3 flex justify-center gap-2">
              {ph.map((p, i) => (
                <button key={p} type="button" onClick={() => setOpen(i)} className={cls('h-14 w-20 overflow-hidden rounded-lg ring-2 ring-offset-2', i === open ? 'ring-acc' : 'ring-transparent')}>
                  <img src={p} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </Dialog>
    </>
  )
}

/** Anchor tabs that stick under the header and follow the scroll. */
export function SectionTabs({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id)
  useEffect(() => {
    const io = new IntersectionObserver(
      (es) => {
        const vis = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (vis) setActive(vis.target.id)
      },
      { rootMargin: '-140px 0px -55% 0px' },
    )
    items.forEach((i) => {
      const el = document.getElementById(i.id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
  }, [items])
  return (
    <nav className="no-scrollbar sticky top-16 z-20 -mx-4 flex gap-6 overflow-x-auto border-b border-line bg-white px-4 md:top-[72px] md:mx-0 md:px-0">
      {items.map((i) => (
        <a key={i.id} href={`#${i.id}`} className={cls('relative flex h-12 flex-none items-center text-[15px]', active === i.id ? 'font-semibold text-ink after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded after:bg-ink' : 'font-medium text-ink-2 hover:text-ink')}>
          {i.label}
        </a>
      ))}
    </nav>
  )
}

export function ServicesSection({ s }: { s: SalonDetail }) {
  const t = useTranslations('salon')
  const tc = useTranslations('common')
  const f = useFmt()
  const groups = [...new Set(s.menu.map((x) => x.group))]
  const popularIds = new Set(s.services.map((x) => x.id))
  const tabs = [t('popular'), ...groups]
  const [tab, setTab] = useState(tabs[0])
  const [all, setAll] = useState(false)
  const list = tab === tabs[0] ? s.menu.filter((x) => popularIds.has(x.id)).concat(s.menu.filter((x) => !popularIds.has(x.id))) : s.menu.filter((x) => x.group === tab)
  const shown = all || tab !== tabs[0] ? list : list.slice(0, 6)
  return (
    <>
      <div className="no-scrollbar -mx-4 mb-2 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
        {tabs.map((g) => (
          <button key={g} type="button" onClick={() => setTab(g)} className={cls('h-9 flex-none rounded-full px-4 text-[14px]', g === tab ? 'bg-ink font-semibold text-white' : 'bg-group font-medium hover:bg-line')}>
            {g}
          </button>
        ))}
      </div>
      <ul>
        {shown.map((x) => (
          <li key={x.id} className="flex items-center gap-4 border-b border-row py-4">
            <div className="min-w-0 flex-1">
              <div className="text-[16px] font-medium">{x.name}</div>
              <div className="mt-0.5 text-[13.5px] text-ink-2">{f.dur(x.dur)}</div>
              {x.desc && <div className="mt-1 line-clamp-2 text-[13.5px] text-ink-3">{x.desc}</div>}
              <div className="mt-1.5 text-[15px] font-semibold">{f.price(x)}</div>
            </div>
            {s.online && (
              <ButtonLink href={`/${s.slug}/book?svc=${x.id}`} variant="outline" size="sm" pill>
                {t('book')}
              </ButtonLink>
            )}
          </li>
        ))}
      </ul>
      {tab === tabs[0] && list.length > 6 && (
        <Button variant="outline" size="sm" className="mt-4" onClick={() => setAll(!all)}>
          {all ? tc('showLess') : `${tc('showAll')} · ${list.length}`}
        </Button>
      )}
    </>
  )
}

export function ReviewsList({ s, initial }: { s: SalonDetail; initial: ReviewPublic[] }) {
  const t = useTranslations()
  const f = useFmt()
  const { data = initial } = useReviews(s.id)
  const [all, setAll] = useState(false)
  const total = s.ratingDist.reduce((a, b) => a + b, 0)
  return (
    <div className="grid gap-8 md:grid-cols-[240px_1fr]">
      <div>
        <div className="text-[48px] font-bold leading-none tracking-[-0.03em]">{f.rating(s.rating.avg)}</div>
        <Stars n={s.rating.avg} size={18} className="mt-2" />
        <div className="mt-1 text-[14px] text-ink-2">{t('common.reviews', { count: s.rating.count })}</div>
        <div className="mt-4 flex flex-col gap-1.5">
          {s.ratingDist.map((n, i) => (
            <div key={i} className="flex items-center gap-2 text-[13px] text-ink-2">
              <span className="w-3 tabular">{5 - i}</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-group">
                <span className="block h-full rounded-full bg-acc" style={{ width: `${total ? (n / total) * 100 : 0}%` }} />
              </span>
            </div>
          ))}
        </div>
        <Note className="mt-5" icon={<MessageSquareText size={16} strokeWidth={1.75} />}>
          {t('salon.reviewsOnlyVisits')}
        </Note>
      </div>
      <div>
        {(all ? data : data.slice(0, 6)).map((r) => (
          <article key={r.id} className="border-b border-row py-5 first:pt-0">
            <div className="flex items-center gap-3">
              <Avatar name={r.clientName} size={40} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">
                  {r.clientName}
                  {r.mine && <span className="font-normal text-ink-3"> · {t('salon.you')}</span>}
                </div>
                <div className="text-[13px] text-ink-3">
                  {f.dayMonth(r.date)} · {r.svc}
                  {r.staffName && ` · ${t('salon.withMaster', { name: r.staffName })}`}
                </div>
              </div>
              <Stars n={r.rating} size={13} />
            </div>
            <p className="mt-3 text-[15px] leading-relaxed">{r.text}</p>
            {r.answer && (
              <div className="mt-3 rounded-xl bg-acc-tint px-4 py-3 text-[14px] text-acc-ink">
                <div className="text-[12px] font-semibold">{t('salon.salonAnswer')}</div>
                {r.answer.text}
              </div>
            )}
          </article>
        ))}
        {data.length > 6 && (
          <Button variant="outline" size="sm" className="mt-5" onClick={() => setAll(!all)}>
            {all ? t('common.showLess') : `${t('common.showAll')} · ${data.length}`}
          </Button>
        )}
      </div>
    </div>
  )
}

export function Hours({ s }: { s: SalonDetail }) {
  const t = useTranslations('common')
  const f = useFmt()
  const d = dow(today())
  const days = Array.from({ length: 7 }, (_, i) => addDays('2024-01-01', i)) // a Monday-first week, for weekday names
  return (
    <ul className="flex flex-col">
      {s.hours.map((h, i) => (
        <li key={i} suppressHydrationWarning className={cls('flex justify-between py-1.5 text-[15px]', i === d && 'font-semibold')}>
          <span className="capitalize">{f.weekdayLong(days[i])}</span>
          <span className={h ? 'tabular' : 'text-ink-3'}>{h ? `${f.hm(h.open)} – ${f.hm(h.close)}` : t('dayOff')}</span>
        </li>
      ))}
    </ul>
  )
}

export function MiniMap({ s }: { s: SalonDetail }) {
  return (
    <div className="h-[260px] overflow-hidden rounded-card border border-line">
      <SalonMap single points={[{ id: s.id, slug: s.slug, name: s.name, lat: s.geo.lat, lng: s.geo.lng, label: '' }]} className="size-full" />
    </div>
  )
}


/** Sticky booking card (desktop) and bottom bar (phone). */
export function BookingCard({ s }: { s: SalonDetail }) {
  const t = useTranslations()
  const f = useFmt()
  const toast = useToast()
  const { data: next, isPending } = useNextFree(s.id, undefined, s.online)
  return (
    <>
      <div className="sticky top-[96px] hidden rounded-[20px] border border-line p-6 lg:block">
        <div className="text-[22px] font-bold tracking-[-0.02em]">{s.name}</div>
        <div className="mt-1 flex items-center gap-1.5 text-[14px]">
          <Stars n={s.rating.avg} size={14} />
          <b>{f.rating(s.rating.avg)}</b>
          <span className="text-ink-2">({s.rating.count})</span>
        </div>
        {s.online ? (
          <>
            <ButtonLink href={`/${s.slug}/book`} block size="lg" className="mt-5">
              {t('salon.book')}
            </ButtonLink>
            <div className="mt-4 flex items-start gap-3 text-[14px]">
              <Clock size={18} strokeWidth={1.75} className="mt-0.5 text-ink-3" />
              <div>
                <div className="text-ink-2">{t('salon.nearest')}</div>
                <div className="font-semibold text-acc-ink">{isPending ? '…' : next ? f.when(next.date, next.start) : t('salon.noNearest')}</div>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-3 text-[14px]">
              <Zap size={18} strokeWidth={1.75} className="mt-0.5 text-ink-3" />
              <div className="text-ink-2">{s.instant ? t('salon.instantNote') : t('salon.manualNote')}</div>
            </div>
          </>
        ) : (
          <>
            <Note tone="amber" className="mt-5">
              <b className="block">{t('salon.offlineTitle')}</b>
              {t('salon.offlineText')}
            </Note>
            <ButtonLink href={`tel:${s.phone.replace(/\s/g, '')}`} block size="lg" className="mt-4" icon={<Phone size={18} strokeWidth={1.75} />}>
              {t('salon.call')}
            </ButtonLink>
            <Button variant="outline" block className="mt-2" onClick={() => toast(t('salon.notifyMeDone'))}>
              {t('salon.notifyMe')}
            </Button>
          </>
        )}
        <div className="mt-5 flex flex-col gap-3 border-t border-line pt-5 text-[14px]">
          <div className="flex items-start gap-3">
            <Clock size={18} strokeWidth={1.75} className="mt-0.5 text-ink-3" />
            <OpenNow s={s} />
          </div>
          <a href={directionsUrl(s)} target="_blank" rel="noreferrer" className="flex items-start gap-3 hover:underline">
            <Navigation size={18} strokeWidth={1.75} className="mt-0.5 text-ink-3" />
            <span>
              {s.address}, {s.district}
            </span>
          </a>
          <a href={`tel:${s.phone.replace(/\s/g, '')}`} className="flex items-start gap-3 hover:underline">
            <Phone size={18} strokeWidth={1.75} className="mt-0.5 text-ink-3" />
            <span>{s.phone}</span>
          </a>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+54px)] z-30 flex items-center gap-3 border-t border-line bg-white px-4 py-3 md:bottom-0 lg:hidden">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold">{t('common.services', { count: s.menu.length })}</div>
          <div className="truncate text-[12.5px] text-ink-2">{s.online ? (next ? `${t('salon.nearest').toLowerCase()} ${f.when(next.date, next.start).toLowerCase()}` : '…') : t('salon.offlineTitle')}</div>
        </div>
        {s.online ? (
          <ButtonLink href={`/${s.slug}/book`}>{t('salon.book')}</ButtonLink>
        ) : (
          <ButtonLink href={`tel:${s.phone.replace(/\s/g, '')}`} icon={<Phone size={17} />}>
            {t('salon.call')}
          </ButtonLink>
        )}
      </div>
    </>
  )
}

export function TeamLink({ slug, id, name, spec, rating }: { slug: string; id: string; name: string; spec: string; rating: string }) {
  return (
    <Link href={`/${slug}/book?staff=${id}`} className="group flex flex-col items-center gap-2 rounded-card p-3 text-center hover:bg-group-2">
      <span className="relative">
        <Avatar name={name} size={76} acc />
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-line bg-white px-2 py-0.5 text-[12px] font-semibold">★ {rating}</span>
      </span>
      <span className="mt-1 font-semibold">{name}</span>
      <span className="line-clamp-2 text-[13px] text-ink-2">{spec}</span>
    </Link>
  )
}

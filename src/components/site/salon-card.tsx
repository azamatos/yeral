'use client'

import { ChevronLeft, ChevronRight, Heart } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useRef, useState } from 'react'
import type { SalonCard as Card } from '@/api'
import { useFavorites, useSession, useToggleFavorite } from '@/api/hooks'
import { cls, hm, today } from '@/domain/time'
import { useFmt } from '@/lib/format'
import { RatingInline, Tag } from '@/components/ui/bits'
import { useToast } from '@/components/ui/toast'

export function FavoriteButton({ salonId, className, size = 18 }: { salonId: string; className?: string; size?: number }) {
  const t = useTranslations('common')
  const router = useRouter()
  const toast = useToast()
  const { data: session } = useSession()
  const { data: favs = [] } = useFavorites(!!session)
  const toggle = useToggleFavorite()
  const on = favs.includes(salonId)
  return (
    <button
      type="button"
      aria-label={on ? t('favoriteRemove') : t('favoriteAdd')}
      aria-pressed={on}
      className={cls('flex items-center justify-center rounded-full transition-transform active:scale-90', className)}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!session) {
          toast(t('loginToSave'), { label: t('favoriteAdd'), run: () => router.push(`/login?next=${encodeURIComponent(location.pathname)}`) })
          return
        }
        toggle.mutate(salonId, { onSuccess: (v) => toast(v ? t('favoriteAdded') : t('favoriteRemoved')) })
      }}
    >
      <Heart size={size} strokeWidth={1.75} fill={on ? '#5a3ff0' : 'none'} color={on ? '#5a3ff0' : 'currentColor'} />
    </button>
  )
}

function Photos({ photos, alt, href, children }: { photos: string[]; alt: string; href: string; children?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [i, setI] = useState(0)
  const go = (d: number) => {
    const el = ref.current
    if (!el) return
    const n = Math.max(0, Math.min(photos.length - 1, i + d))
    el.scrollTo({ left: n * el.clientWidth, behavior: 'smooth' })
  }
  return (
    <div className="group/ph relative overflow-hidden rounded-[14px] bg-group">
      <Link href={href} tabIndex={-1} aria-hidden>
        <div
          ref={ref}
          className="no-scrollbar flex aspect-[16/10] snap-x snap-mandatory overflow-x-auto"
          onScroll={(e) => setI(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        >
          {photos.map((p, k) => (
            <img key={p} src={p} alt={k === 0 ? alt : ''} loading="lazy" className="size-full flex-none snap-start object-cover" />
          ))}
        </div>
      </Link>
      {i > 0 && (
        <button type="button" aria-label="Предыдущее фото" onClick={() => go(-1)} className="absolute left-2 top-1/2 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 shadow-[0_1px_4px_rgb(0_0_0/0.15)] group-hover/ph:flex">
          <ChevronLeft size={18} />
        </button>
      )}
      {i < photos.length - 1 && (
        <button type="button" aria-label="Следующее фото" onClick={() => go(1)} className="absolute right-2 top-1/2 hidden size-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 shadow-[0_1px_4px_rgb(0_0_0/0.15)] group-hover/ph:flex">
          <ChevronRight size={18} />
        </button>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center gap-1">
        {photos.map((p, k) => (
          <span key={p} className={cls('size-1.5 rounded-full transition-colors', k === i ? 'bg-white' : 'bg-white/50')} />
        ))}
      </div>
      {children}
    </div>
  )
}

export function SalonCard({
  s,
  times,
  date,
  highlight,
  onHover,
  compact,
}: {
  s: Card
  /** free start times for `date` — turns the card into a quick booking card */
  times?: number[]
  date?: string
  highlight?: boolean
  onHover?: (id: string | null) => void
  compact?: boolean
}) {
  const t = useTranslations()
  const f = useFmt()
  const href = `/${s.slug}`
  const d = date ?? today()
  const svc = s.services[0]
  return (
    <article
      className={cls('group flex flex-col gap-3 rounded-[18px] transition-shadow', highlight && 'ring-2 ring-acc ring-offset-4')}
      onMouseEnter={() => onHover?.(s.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <Photos photos={compact ? s.photos.slice(0, 3) : s.photos.slice(0, 5)} alt={s.name} href={href}>
        <div className="absolute left-2.5 top-2.5 flex gap-1.5">
          {s.isNew && <Tag tone="white">{t('common.new')}</Tag>}
          {!s.online && <Tag tone="amber">{t('common.onlyByPhone')}</Tag>}
        </div>
        <FavoriteButton salonId={s.id} className="absolute right-2.5 top-2.5 size-9 bg-white/95 text-ink shadow-[0_1px_4px_rgb(0_0_0/0.12)]" />
      </Photos>
      <Link href={href} className="flex flex-col gap-0.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="truncate text-[17px] font-semibold tracking-[-0.01em]">{s.name}</h3>
          <RatingInline avg={f.rating(s.rating.avg)} count={String(s.rating.count)} className="mt-0.5 text-[14px]" />
        </div>
        <div className="truncate text-[14px] text-ink-2">
          {s.kind} · {s.district}, {s.address}
        </div>
      </Link>
      {!compact && (
        <ul className="flex flex-col">
          {s.services.map((x) => (
            <li key={x.id} className="flex items-baseline gap-3 border-t border-row py-2 text-[14px]">
              <span className="min-w-0 flex-1 truncate">{x.name}</span>
              <span className="flex-none text-[13px] text-ink-3">{f.dur(x.dur)}</span>
              <span className="w-[72px] flex-none text-right font-semibold">{f.price(x)}</span>
            </li>
          ))}
        </ul>
      )}
      {times && s.online && svc && (
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {times.length ? (
            <>
              {times.slice(0, 6).map((m) => (
                <Link key={m} href={`${href}/book?svc=${svc.id}&date=${d}&time=${m}`} className="flex h-9 flex-none items-center rounded-[10px] bg-acc-tint px-3 text-[14px] font-semibold text-acc-ink tabular hover:bg-[#e5e0fd]">
                  {hm(m)}
                </Link>
              ))}
              {times.length > 6 && (
                <Link href={`${href}/book?svc=${svc.id}&date=${d}`} className="flex h-9 flex-none items-center rounded-[10px] border border-line px-3 text-[13.5px] font-medium text-ink-2 hover:bg-group-2">
                  {t('search.moreTimes', { count: times.length - 6 })}
                </Link>
              )}
            </>
          ) : (
            <span className="text-[13.5px] text-ink-3">{t('search.noTimesThatDay')}</span>
          )}
        </div>
      )}
    </article>
  )
}

export function SalonCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <span className="block aspect-[16/10] animate-skel rounded-[14px] bg-[#f0f0f3]" />
      <span className="block h-5 w-2/3 animate-skel rounded bg-[#f0f0f3]" />
      <span className="block h-4 w-1/2 animate-skel rounded bg-[#f0f0f3]" />
    </div>
  )
}

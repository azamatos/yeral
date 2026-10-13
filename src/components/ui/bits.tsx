import { Star } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ViewStatus } from '@/domain/types'
import { cls } from '@/domain/time'

/** One semantics for both apps (DS v2 «Статусы брони»): bg / 1px line / ink / dot. */
export const STATUS_COLORS: Record<ViewStatus, { bg: string; line: string; ink: string; dot: string }> = {
  pending: { bg: '#fef6e7', line: '#f2ddb0', ink: '#93500a', dot: '#dc8b0b' },
  confirmed: { bg: '#efecfe', line: '#d5cbfb', ink: '#4429d6', dot: '#5a3ff0' },
  done: { bg: '#e7f8ee', line: '#bfe6d1', ink: '#066a41', dot: '#12a366' },
  cancelled: { bg: '#eef1f6', line: '#d3dbe6', ink: '#41505f', dot: '#7b8ea3' },
  declined: { bg: '#eef1f6', line: '#d3dbe6', ink: '#41505f', dot: '#7b8ea3' },
  noshow: { bg: '#fdeceb', line: '#f6c9c4', ink: '#a8281c', dot: '#d9412f' },
  expired: { bg: '#eef1f6', line: '#d3dbe6', ink: '#41505f', dot: '#7b8ea3' },
}

export function StatusBadge({ status, label, className }: { status: ViewStatus; label: string; className?: string }) {
  const c = STATUS_COLORS[status]
  return (
    <span className={cls('inline-flex h-[26px] flex-none items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 text-[12px] font-semibold', className)} style={{ background: c.bg, borderColor: c.line, color: c.ink }}>
      <span className="size-[7px] rounded-full" style={{ background: c.dot }} />
      {label}
    </span>
  )
}

type TagTone = 'acc' | 'gray' | 'amber' | 'green' | 'dark' | 'white'
const TONES: Record<TagTone, string> = {
  acc: 'bg-acc-tint border-acc-line text-acc-ink',
  gray: 'bg-group border-line text-ink-2',
  amber: 'bg-amber-tint border-amber-line text-amber-ink',
  green: 'bg-green-tint border-green-line text-green-ink',
  dark: 'bg-ink border-ink text-white',
  white: 'bg-white/95 border-transparent text-ink shadow-[0_1px_3px_rgb(0_0_0/0.12)]',
}

export function Tag({ tone = 'acc', children, className, icon }: { tone?: TagTone; children: ReactNode; className?: string; icon?: ReactNode }) {
  return (
    <span className={cls('inline-flex h-6 flex-none items-center gap-1 whitespace-nowrap rounded-[7px] border px-2 text-[11.5px] font-semibold', TONES[tone], className)}>
      {icon}
      {children}
    </span>
  )
}

/** Only the rating star is filled (DS v2 icon rule). */
export function Stars({ n, size = 14, onPick, className }: { n: number; size?: number; onPick?: (n: number) => void; className?: string }) {
  return (
    <span className={cls('inline-flex gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map((i) => {
        const on = i <= Math.round(n)
        const star = <Star size={size} strokeWidth={1.75} fill={on ? '#5a3ff0' : 'none'} color={on ? '#5a3ff0' : '#d8d8de'} />
        return onPick ? (
          <button key={i} type="button" aria-label={String(i)} className="p-1 transition-transform hover:scale-110" onClick={() => onPick(i)}>
            {star}
          </button>
        ) : (
          <span key={i}>{star}</span>
        )
      })}
    </span>
  )
}

export function RatingInline({ avg, count, label, className }: { avg: string; count?: string; label?: string; className?: string }) {
  return (
    <span className={cls('inline-flex items-center gap-1 whitespace-nowrap', className)}>
      <Star size={14} strokeWidth={1.75} fill="#101014" color="#101014" aria-hidden />
      <b className="font-semibold">{avg}</b>
      {count && <span className="text-ink-2">({count})</span>}
      {label && <span className="sr-only">{label}</span>}
    </span>
  )
}

export function Avatar({ name, size = 44, acc, img, square, className }: { name: string; size?: number; acc?: boolean; img?: string; square?: boolean; className?: string }) {
  return (
    <span
      className={cls('flex flex-none items-center justify-center overflow-hidden font-semibold', acc ? 'bg-acc-tint text-acc-ink' : 'bg-[#f0f0f3] text-ink-2', square ? 'rounded-xl' : 'rounded-full', className)}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {img ? <img src={img} alt="" className="size-full object-cover" /> : (name.trim()[0] || '?').toUpperCase()}
    </span>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <span className={cls('block animate-skel rounded-lg bg-[#f0f0f3]', className)} />
}

export function Note({ tone = 'gray', icon, children, className }: { tone?: 'gray' | 'amber' | 'acc' | 'red' | 'green'; icon?: ReactNode; children: ReactNode; className?: string }) {
  const t = { gray: 'bg-group text-ink-2', amber: 'bg-amber-tint text-[#7a4308]', acc: 'bg-acc-tint text-acc-ink', red: 'bg-red-tint text-red-ink', green: 'bg-green-tint text-green-ink' }[tone]
  return (
    <div className={cls('flex gap-2.5 rounded-xl px-3.5 py-3 text-[13.5px] leading-snug', t, className)}>
      {icon && <span className="mt-px flex-none">{icon}</span>}
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function Empty({ icon, title, text, children }: { icon: ReactNode; title: string; text?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-7 py-14 text-center">
      <div className="mb-2 flex size-16 items-center justify-center rounded-[20px] bg-acc-tint text-acc">{icon}</div>
      <div className="text-[19px] font-bold tracking-[-0.02em]">{title}</div>
      {text && <div className="max-w-xs text-[14px] leading-snug text-ink-2">{text}</div>}
      {children && <div className="mt-3">{children}</div>}
    </div>
  )
}

export function Chip({ on, children, className, ...rest }: { on?: boolean; children: ReactNode } & React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      aria-pressed={on}
      className={cls(
        'inline-flex h-9 flex-none items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[13.5px] font-medium transition-colors',
        on ? 'border-ink bg-ink font-semibold text-white' : 'border-line bg-white text-ink hover:border-line-2 hover:bg-group-2',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cls('flex h-[31px] w-[51px] flex-none rounded-full p-0.5 transition-colors', on ? 'bg-green' : 'bg-line-2')}
    >
      <span className={cls('size-[27px] rounded-full bg-white shadow-[0_2px_4px_rgb(0_0_0/0.18)] transition-transform', on && 'translate-x-5')} />
    </button>
  )
}

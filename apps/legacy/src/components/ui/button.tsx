import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'
import { twMerge } from 'tailwind-merge'
import { cls } from '@/domain/time'

/** Lucide stroke width from the design system */
export const SW = 1.75

type Variant = 'primary' | 'dark' | 'outline' | 'soft' | 'ghost' | 'danger' | 'dangerSolid' | 'white'
type Size = 'xs' | 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-[transform,background,opacity,box-shadow] duration-100 active:scale-[0.98] disabled:pointer-events-none select-none'

const variants: Record<Variant, string> = {
  // gradient CTA from the reworked deck: vertical gradient, inner highlight, 1px shadow
  primary: 'text-white [background:var(--grad)] shadow-[var(--shadow-btn)] hover:[background:var(--grad-hover)] disabled:[background:#e6e6ea] disabled:text-[#a0a0aa] disabled:shadow-none',
  dark: 'bg-ink text-white hover:bg-ink-hover disabled:bg-line disabled:text-ink-4',
  outline: 'border border-line-2 bg-white text-ink hover:bg-group-2 disabled:text-ink-4',
  soft: 'bg-acc-tint text-acc-ink hover:bg-[#e5e0fd]',
  ghost: 'bg-transparent text-ink hover:bg-group',
  danger: 'bg-red-tint text-red-ink hover:bg-[#fbdedb]',
  dangerSolid: 'bg-red text-white hover:bg-[#c43626]',
  white: 'bg-white text-ink shadow-[0_1px_3px_rgb(0_0_0/0.12)] hover:bg-group-2',
}

const sizes: Record<Size, string> = {
  xs: 'h-8 px-3 text-[13px] rounded-[9px]',
  sm: 'h-9 px-3.5 text-[14px] rounded-[10px]',
  md: 'h-11 px-5 text-[15px] rounded-[12px]',
  lg: 'h-[52px] px-6 text-[16px] rounded-[14px]',
}

export function buttonClass({ variant = 'primary', size = 'md', block, pill, className }: { variant?: Variant; size?: Size; block?: boolean; pill?: boolean; className?: string } = {}) {
  // twMerge: a className passed in (e.g. `hidden lg:inline-flex`) wins over the defaults
  return twMerge(cls(base, variants[variant], sizes[size], block && 'w-full', pill && 'rounded-full', className))
}

type Common = { variant?: Variant; size?: Size; block?: boolean; pill?: boolean; icon?: ReactNode }

export function Button({ variant, size, block, pill, icon, className, children, type = 'button', ...rest }: Common & ComponentProps<'button'>) {
  return (
    <button type={type} className={buttonClass({ variant, size, block, pill, className })} {...rest}>
      {icon}
      {children}
    </button>
  )
}

export function ButtonLink({ variant, size, block, pill, icon, className, children, ...rest }: Common & ComponentProps<typeof Link>) {
  return (
    <Link className={buttonClass({ variant, size, block, pill, className })} {...rest}>
      {icon}
      {children}
    </Link>
  )
}

export function IconButton({ className, label, children, ...rest }: ComponentProps<'button'> & { label: string }) {
  return (
    <button type="button" aria-label={label} title={label} className={cls('inline-flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-group', className)} {...rest}>
      {children}
    </button>
  )
}

import { cva, type VariantProps } from 'class-variance-authority'
import { Plus } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

/**
 * Sizes and letters from DS-Patterns (`.av` 32/14, `.av24`, `.av28`, `.av40`, `.av48`, `.av64`; the workspace letter
 * tile `.y-wlt` 32/14 · 36/15 · 40/16). A square (a business logo, a workspace without one) rounds by size as the
 * board's logos: 28 r8, 36 r10, 44 r12, 64 r14 (COMPONENTS.md → Avatar).
 */
const avatar = cva('inline-flex flex-none items-center justify-center overflow-hidden font-bold select-none', {
  variants: {
    size: {
      24: 'size-6 text-micro',
      28: 'size-7 text-micro',
      32: 'size-8 text-[14px]',
      36: 'size-9 text-[15px]',
      40: 'size-10 text-[16px]',
      44: 'size-11 text-[17px]',
      48: 'size-12 text-[19px]',
      56: 'size-14 text-[22px]',
      64: 'size-16 text-[26px]',
    },
    shape: { circle: 'rounded-pill', square: '' },
    tone: { tint: 'bg-a-50 text-a-600', neutral: 'bg-n-100 text-n-600' },
  },
  compoundVariants: [
    { shape: 'square', size: [24, 28, 32], className: 'rounded-input' },
    { shape: 'square', size: [36, 40], className: 'rounded-s' },
    { shape: 'square', size: [44, 48], className: 'rounded-m' },
    { shape: 'square', size: [56, 64], className: 'rounded-l' },
  ],
  defaultVariants: { size: 40, shape: 'circle', tone: 'tint' },
})

/**
 * First letters of the first two words: «Aýjemal Gurbanowa» → «AG»; one word → one letter. Marks around a name don't
 * count («Gözel» salon → «GS»), and a word without a letter or digit is skipped (an emoji).
 */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((word) => [...word].find((ch) => /[\p{L}\p{N}]/u.test(ch)))
    .filter((ch): ch is string => !!ch)
    .slice(0, 2)
    .map((ch) => ch.toLocaleUpperCase('tk'))
    .join('')
}

/**
 * A person's or a business's picture: the photo when there is one, otherwise initials (a person, on tint) or the first
 * letter (`letters={1}`: a workspace's letter tile, square and neutral). `decorative` when the name is written right
 * next to it, so a screen reader doesn't hear it twice (`alt=""`).
 */
export function Avatar({
  name,
  src,
  size,
  shape,
  tone,
  letters = 2,
  decorative = false,
  className,
  ...props
}: Omit<ComponentProps<'span'>, 'children'> &
  VariantProps<typeof avatar> & { name: string; src?: string | null; letters?: 1 | 2; decorative?: boolean }) {
  const text = letters === 1 ? initials(name).charAt(0) : initials(name)
  return (
    <span {...props} aria-hidden={decorative || props['aria-hidden']} className={cn(avatar({ size, shape, tone }), className)}>
      {src ? (
        <img src={src} alt={decorative ? '' : name} className="size-full object-cover" />
      ) : decorative ? (
        // drawn, not written: a button named "Account menu: Maýsa Annaýewa" holds no stray "MA"
        <span data-letters={text} className="before:content-[attr(data-letters)]" />
      ) : (
        <span aria-label={name} role="img">
          {text}
        </span>
      )}
    </span>
  )
}

/**
 * "Add" (DS-Patterns AddAvatar, 40): an empty picture, white with a 1px accent ring and a plus. Visual only: the button
 * around it carries the label.
 */
export function AddAvatar({ className, ...props }: Omit<ComponentProps<'span'>, 'children'>) {
  return (
    <span
      {...props}
      aria-hidden
      className={cn(avatar({ size: 40 }), 'bg-n-0 text-a-600 shadow-[inset_0_0_0_1px_var(--color-a-line)]', className)}
    >
      <Plus className="size-4" strokeWidth={2} />
    </span>
  )
}

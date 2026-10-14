import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

const avatar = cva('inline-flex flex-none items-center justify-center overflow-hidden rounded-pill font-bold select-none', {
  variants: {
    size: {
      32: 'size-8 text-dense',
      40: 'size-10 text-[16px]',
      44: 'size-11 text-[17px] font-semibold',
      48: 'size-12 text-[18px] font-semibold',
      56: 'size-14 text-[22px]',
    },
    tone: { tint: 'bg-a-50 text-a-600', neutral: 'bg-n-100 text-n-900' },
  },
  defaultVariants: { size: 40, tone: 'tint' },
})

/** First letters of the first two words: «Aýjemal Gurbanowa» → «AG»; one word → one letter. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return words
    .slice(0, 2)
    .map((w) => w.charAt(0).toLocaleUpperCase('tk'))
    .join('')
    .slice(0, words.length > 1 ? 2 : 1)
}

/** Person or business avatar: photo when there is one, otherwise initials on tint. */
export function Avatar({
  name,
  src,
  size,
  tone,
  className,
  ...props
}: Omit<ComponentProps<'span'>, 'children'> & VariantProps<typeof avatar> & { name: string; src?: string }) {
  return (
    <span {...props} className={cn(avatar({ size, tone }), className)}>
      {src ? (
        <img src={src} alt={name} className="size-full object-cover" />
      ) : (
        <span aria-label={name} role="img">
          {initials(name)}
        </span>
      )}
    </span>
  )
}

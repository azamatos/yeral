import type { ComponentProps } from 'react'
import { cn } from '../lib/cn'
import icon from './yeral-icon.png'
import lockupInk from './yeral-lockup-ink.png'
import lockupWhite from './yeral-lockup-white.png'
import mark from './yeral-mark.png'

const sources = { 'lockup-ink': lockupInk, 'lockup-white': lockupWhite, mark, icon } as const
const ratio = { 'lockup-ink': 740 / 230, 'lockup-white': 740 / 230, mark: 236 / 220, icon: 1 } as const

/** The logo as an image. Header lockup is 28 high (DS top nav). `alt` is the brand name from i18n. */
export function Logo({
  variant = 'lockup-ink',
  height = 28,
  className,
  ...props
}: Omit<ComponentProps<'img'>, 'src' | 'height' | 'width'> & { variant?: keyof typeof sources; height?: number; alt: string }) {
  return (
    <img
      {...props}
      src={sources[variant]}
      height={height}
      width={Math.round(height * ratio[variant])}
      className={cn('block h-auto max-w-none', className)}
      style={{ height }}
    />
  )
}

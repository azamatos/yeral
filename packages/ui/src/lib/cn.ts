import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// tailwind-merge needs to know the design's custom scales, or it would treat `text-small` (size) and `text-n-600` (colour) as the same group.
const twMerge = extendTailwindMerge({
  extend: {
    // the radius scale covers every side and corner (`rounded-t-card`, `rounded-bl-xs`)
    theme: { radius: ['xs', 'sm', 'input', 's', 'm', 'l', 'card', 'pill'] },
    classGroups: {
      'font-size': [{ text: ['display', 'h1', 'h2', 'h3', 'body-l', 'body', 'dense', 'button', 'button-l', 'label', 'small', 'micro'] }],
      shadow: [
        {
          shadow: [
            'raised',
            'sheet',
            'primary',
            'primary-active',
            'focus',
            'primary-focus',
            'input-focus',
            'input-error',
            'input-warning',
            'focus-inset',
            'control',
            'segment',
            'switch-off',
          ],
        },
      ],
    },
  },
})

/** Joins class names; later Tailwind classes win over earlier ones (a passed `className` overrides defaults). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

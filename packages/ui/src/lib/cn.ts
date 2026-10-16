import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// tailwind-merge needs to know the design's custom scales, or it would treat `text-small` (size) and `text-n-600` (colour) as the same group.
const twMerge = extendTailwindMerge({
  extend: {
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
      rounded: [{ rounded: ['xs', 'sm', 'input', 's', 'm', 'l', 'card', 'pill'] }],
    },
  },
})

/** Joins class names; later Tailwind classes win over earlier ones (a passed `className` overrides defaults). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

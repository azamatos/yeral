import { Globe } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Menu, MenuContent, MenuRadioGroup, MenuRadioItem, MenuTrigger } from '../menu'

export type LanguageOption = {
  value: string
  /** native name: Türkmençe, Русский, English */ name: string
  /** name in the current UI language */ localName?: string
}

/**
 * Language switcher (DS-Components → Navigation): globe + code in the header, a radio menu of languages, English first
 * and then the market's (DS-Patterns v0.6). With one language it renders nothing: the first launch has no switcher.
 * `actionLabel` is screen-reader text after the code, e.g. «choose a language».
 */
export function LanguageSwitcher({
  value,
  options,
  onValueChange,
  actionLabel,
  className,
}: {
  value: string
  options: LanguageOption[]
  onValueChange: (value: string) => void
  actionLabel: string
  className?: string
}) {
  // nothing to switch to: no control at all, not a disabled one (DS-Patterns «One language»)
  if (options.length < 2) return null
  return (
    <Menu>
      <MenuTrigger
        className={cn(
          'inline-flex h-10 cursor-pointer items-center gap-2 rounded-s border-0 bg-transparent px-3 text-body font-medium text-n-900 uppercase hover:bg-group',
          'focus-visible:shadow-focus focus-visible:outline-none',
          className,
        )}
      >
        <Globe aria-hidden className="size-[18px]" />
        {value}
        <span className="sr-only normal-case"> — {actionLabel}</span>
      </MenuTrigger>
      <MenuContent className="w-60">
        <MenuRadioGroup value={value} onValueChange={onValueChange}>
          {options.map((o) => (
            <MenuRadioItem
              key={o.value}
              value={o.value}
              description={o.localName && o.localName !== o.name ? o.localName : undefined}
              lang={o.value}
            >
              {o.name}
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  )
}

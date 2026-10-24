import { Check, Copy, Share2 } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button } from '../button'
import { inputClass } from '../input'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../menu'

/** How long «Copied» stays before the button reads «Copy» again. */
const COPIED_MS = 2000

/** A place to share the value to, opened in a new tab: WhatsApp's or Telegram's share address. */
export interface ShareTarget {
  id: string
  label: string
  href: string
}

export type CopyFieldProps = {
  /** What lands on the clipboard: the full address, a phone number. */
  value: string
  /** What's shown, when it differs from what's copied: `yeral.app/b/glow-studio` for `https://yeral.app/b/glow-studio`. */
  display?: string
  /** `field`: the read-only 44 field with Copy (and Share); `inline`: the value as text with an icon button (B-Client's phone). */
  variant?: 'field' | 'inline'
  /** The field's name («Your page link»); for `inline` the icon button's name («Copy number»). */
  label: string
  copy: {
    /** The Copy button's words (`field`). */
    copy: string
    /** Said and shown for 2 s after a copy: «Copied». */
    copied: string
  }
  /** The Share button (`field` only): its words and the menu's places. */
  share?: { label: string; targets: readonly ShareTarget[] }
  /** After the value is on the clipboard. */
  onCopy?: () => void
  /** `inline`: more actions after the copy button («Call»). */
  children?: ReactNode
  className?: string
}

/** Select an element's text for a manual copy (the `inline` value, when the clipboard refuses). */
function selectText(element: HTMLElement | null) {
  const selection = element ? window.getSelection() : null
  if (!element || !selection) return
  const range = document.createRange()
  range.selectNodeContents(element)
  selection.removeAllRanges()
  selection.addRange(range)
}

/**
 * CopyField (DS-Patterns → «Copy field»; B-Settings Link and QR, B-Onboarding's last step, B-Client's phone): a
 * read-only 44 field with secondary S Copy and Share, or a value with a ghost icon button. Copy puts `value` on the
 * clipboard and reads «Copied» with a check for 2 s, said once to screen readers. If the clipboard refuses (denied,
 * or a page without HTTPS), nothing claims a copy: the field shows the full `value` and selects it, or the inline
 * value is selected, for ⌘C. Share is a menu of places, each opened in a new tab. The board's toast for a button
 * scrolled off screen isn't here: the button is on screen when it's pressed.
 */
export function CopyField({ value, display, variant = 'field', label, copy, share, onCopy, children, className }: CopyFieldProps) {
  const [copied, setCopied] = useState(false)
  // after a refused copy the field shows what Copy would have copied, selected
  const [manual, setManual] = useState(false)
  const field = useRef<HTMLInputElement>(null)
  const text = useRef<HTMLSpanElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => {
    if (manual) field.current?.select()
  }, [manual])

  const copyValue = async () => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      if (variant === 'inline') selectText(text.current)
      else if (manual) field.current?.select()
      else setManual(true)
      return
    }
    clearTimeout(timer.current)
    setCopied(true)
    timer.current = setTimeout(() => setCopied(false), COPIED_MS)
    onCopy?.()
  }

  const said = (
    <span aria-live="polite" className="sr-only">
      {copied ? copy.copied : ''}
    </span>
  )
  const check = <Check aria-hidden className="text-st-completed-ink" />

  if (variant === 'inline')
    return (
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        <span ref={text} className="text-body font-medium text-n-900 tabular-nums">
          {display ?? value}
        </span>
        <Button variant="ghost" size="s" iconOnly aria-label={label} title={label} onClick={() => void copyValue()}>
          {copied ? check : <Copy aria-hidden />}
        </Button>
        {children}
        {said}
      </div>
    )

  return (
    // the buttons wrap under the field when the row is narrow (B-Settings `.lrow`: a phone)
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <input
        ref={field}
        readOnly
        value={manual ? value : (display ?? value)}
        aria-label={label}
        // on click too: WebKit's mouseup undoes a select() made on focus
        onFocus={(event) => event.currentTarget.select()}
        onClick={(event) => event.currentTarget.select()}
        className={cn(inputClass, 'h-11 flex-[1_1_260px] border-n-200 bg-n-50 text-small font-medium hover:border-n-200')}
      />
      <Button size="s" className={copied ? 'min-w-32' : undefined} onClick={() => void copyValue()}>
        {copied ? check : <Copy aria-hidden />}
        {copied ? copy.copied : copy.copy}
      </Button>
      {share?.targets.length ? (
        <Menu>
          <MenuTrigger asChild>
            <Button size="s">
              <Share2 aria-hidden />
              {share.label}
            </Button>
          </MenuTrigger>
          <MenuContent aria-label={share.label} className="w-auto min-w-44">
            {share.targets.map((target) => (
              <MenuItem key={target.id} asChild>
                <a href={target.href} target="_blank" rel="noreferrer">
                  {target.label}
                </a>
              </MenuItem>
            ))}
          </MenuContent>
        </Menu>
      ) : null}
      {said}
    </div>
  )
}

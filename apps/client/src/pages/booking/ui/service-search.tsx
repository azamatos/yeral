import { cn } from '@yeral/ui/cn'
import { Input, type InputSize } from '@yeral/ui/input'
import { Search, X } from 'lucide-react'

const icon: Record<InputSize, { lens: string; input: string; clear: string; x: string }> = {
  s: { lens: 'left-2.5 size-4', input: 'pr-8 pl-8', clear: 'right-0.5 size-7', x: 'size-3.5' },
  m: { lens: 'left-3 size-4.5', input: 'pr-10 pl-9', clear: 'right-1 size-8', x: 'size-4' },
  l: { lens: 'left-3.5 size-5', input: 'pr-11 pl-11', clear: 'right-2 size-8', x: 'size-5' },
}

/**
 * The search inside a list of services (Venue v0.7 · C3 `ServiceSearch`, C7-Booking C4.2 and C4.4): `type=search`
 * with the lens, × and Esc clear it. S inside the summary's popover, M on the services step, L on a phone's sheet.
 */
export function ServiceSearch({
  value,
  onChange,
  label,
  clearLabel,
  size = 'm',
  className,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  clearLabel: string
  size?: InputSize
  className?: string
}) {
  const s = icon[size]
  return (
    <div className={cn('relative', className)}>
      <Search aria-hidden strokeWidth={1.75} className={cn('pointer-events-none absolute top-1/2 -translate-y-1/2 text-n-500', s.lens)} />
      <Input
        type="search"
        size={size}
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && value) {
            e.preventDefault()
            e.stopPropagation()
            onChange('')
          }
        }}
        className={cn('w-full [&::-webkit-search-cancel-button]:hidden', s.input)}
      />
      {value && (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={() => onChange('')}
          className={cn(
            'absolute top-1/2 flex -translate-y-1/2 cursor-pointer items-center justify-center rounded-ctl-s border-0 bg-transparent text-n-600 hover:text-n-900 focus-visible:shadow-focus focus-visible:outline-none',
            s.clear,
          )}
        >
          <X aria-hidden strokeWidth={1.75} className={s.x} />
        </button>
      )}
    </div>
  )
}

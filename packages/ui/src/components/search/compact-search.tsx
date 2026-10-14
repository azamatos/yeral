import { Search } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * The search summary on inner pages (DS-Components → «Search · compact»): what was searched, the details in grey,
 * and «Üýtget» to change it. The whole bar is one button that opens the search.
 */
export function CompactSearch({
  query,
  details,
  actionLabel,
  className,
  ...props
}: ComponentProps<'button'> & { query: ReactNode; details?: ReactNode; actionLabel: ReactNode }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'flex h-11 w-full max-w-110 cursor-pointer items-center gap-2.5 rounded-m border border-n-300 bg-n-0 pr-1.5 pl-3.5 text-left hover:bg-n-50',
        className,
      )}
    >
      <Search aria-hidden className="size-[18px] flex-none text-n-600" />
      <span className="min-w-0 flex-1 truncate text-small font-medium text-n-900">
        {query}
        {details && <span className="font-normal text-n-500"> · {details}</span>}
      </span>
      <span className="inline-flex h-8 flex-none items-center rounded-input bg-group px-2.5 text-dense font-semibold text-n-900">
        {actionLabel}
      </span>
    </button>
  )
}

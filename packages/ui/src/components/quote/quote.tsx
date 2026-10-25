import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * Quote (DS-Patterns → «Quote block · somebody else's words»): a client's note, a review, a business's reply, as a
 * `figure` on n-50 (r12, 12 14): a caps `label` («Client note») or a `meta` line (who, stars, when) in its
 * `figcaption`, the words in a `blockquote` 14/20. The words come from the caller.
 */
export function Quote({
  label,
  meta,
  className,
  children,
  ...props
}: ComponentProps<'figure'> & {
  /** A caps label above the words: «Client note». */
  label?: ReactNode
  /** Who said it, and when: «Gülälek N. ★★★★★ 2 weeks ago». */
  meta?: ReactNode
}) {
  return (
    <figure {...props} className={cn('m-0 flex flex-col gap-1.5 rounded-m bg-n-50 px-3.5 py-3', className)}>
      {(label || meta) && (
        <figcaption className={label ? 'text-label text-n-500 uppercase' : 'flex flex-wrap items-center gap-2 text-dense'}>
          {label ?? meta}
        </figcaption>
      )}
      <blockquote className="m-0 text-small text-n-900">{children}</blockquote>
    </figure>
  )
}

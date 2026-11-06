import { cn } from '@yeral/ui/cn'
import { useId, type ComponentProps, type ReactNode } from 'react'
import type { Listbox } from '../model/use-listbox'

/** One row the input's ↑ ↓ can reach; `tall` rows (56 / 64) carry a photo or a tile. */
export type Row = { id: string; node: ReactNode; pick: () => void; tall?: boolean; selected?: boolean }
/** A group of rows under its name (11 caps), maybe with a small action at its right («Clear») or a line above it. */
export type Section = { title?: ReactNode; aside?: ReactNode; divider?: boolean; rows: Row[] }

/**
 * The raised panel 8 px under the bar (C7-Home `.spn`: r 16, 8 padding, max 420 tall, never over the Search button);
 * `touch` = the phone sheet's rows in the flow instead.
 */
export function Panel({ touch, className, ...props }: ComponentProps<'div'> & { touch?: boolean }) {
  return (
    <div
      {...props}
      className={cn(
        touch
          ? 'flex min-h-0 flex-1 flex-col overflow-y-auto pb-4'
          : 'absolute top-[calc(100%+8px)] z-20 flex max-h-105 flex-col overflow-y-auto rounded-card border border-n-200 bg-n-0 p-2 shadow-raised',
        className,
      )}
    />
  )
}

export function SectionTitle({ touch, aside, id, children }: { touch?: boolean; aside?: ReactNode; id?: string; children: ReactNode }) {
  return (
    <div
      role="presentation"
      className={cn('flex flex-none items-center justify-between text-label text-n-500 uppercase', touch ? 'h-9 px-4 pt-2' : 'h-8 px-2.5')}
    >
      <span id={id}>{children}</span>
      {aside}
    </div>
  )
}

export function Divider({ touch }: { touch?: boolean }) {
  return <div role="presentation" className={cn('my-1.5 flex-none border-t border-n-200', touch ? 'mx-4' : '-mx-2')} />
}

/** The groups' rows as one listbox the input points at; a tap picks a row while the input keeps the focus. */
export function Rows({
  id,
  label,
  sections,
  listbox,
  touch,
}: {
  id: string
  label: string
  sections: Section[]
  listbox: Listbox
  touch?: boolean
}) {
  const base = useId()
  const shown = sections.filter((s) => s.rows.length > 0)
  if (shown.length === 0) return null
  return (
    <div role="listbox" id={id} aria-label={label} className="flex flex-none flex-col">
      {shown.map((section, i) => (
        <div
          key={i}
          role={section.title ? 'group' : 'presentation'}
          aria-labelledby={section.title ? `${base}-${i}` : undefined}
          className="flex flex-none flex-col"
        >
          {section.divider && <Divider touch={touch} />}
          {section.title && (
            <SectionTitle touch={touch} aside={section.aside} id={`${base}-${i}`}>
              {section.title}
            </SectionTitle>
          )}
          {section.rows.map((row) => (
            <div
              key={row.id}
              id={row.id}
              role="option"
              aria-selected={listbox.active === row.id}
              className={cn(
                'flex flex-none cursor-pointer items-center text-n-900 hover:bg-n-50 [&>svg]:size-4.5 [&>svg]:flex-none [&>svg]:text-n-600',
                touch
                  ? cn('gap-3 px-4 text-[16px] leading-6', row.tall ? 'h-16' : 'h-12')
                  : cn('rounded-ctl-s px-2.5 text-small', row.tall ? 'h-14 gap-3' : 'h-9 gap-2.5'),
                row.selected && 'font-semibold',
                listbox.active === row.id && 'bg-n-50',
              )}
              onMouseDown={(e) => e.preventDefault()}
              onMouseMove={() => listbox.active !== row.id && listbox.setActive(row.id)}
              onClick={row.pick}
            >
              {row.node}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

/** The grey facts at a row's right: a category, a place. */
export function Meta({ children }: { children: ReactNode }) {
  return <span className="ml-auto flex-none pl-3 text-dense font-normal text-n-500">{children}</span>
}

/** The violet tile of a tall row (Near me, a business without a photo): 36 on the bar, 44 on the sheet. */
export function Tile({ touch, children }: { touch?: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        'flex flex-none items-center justify-center bg-a-50 font-semibold text-a-600 [&>svg]:size-4.5',
        touch ? 'size-11 rounded-ctl-l' : 'size-9 rounded-ctl-m',
      )}
    >
      {children}
    </span>
  )
}

/** The typed part of a suggestion in 600. */
export function Mark({ text, q }: { text: string; q: string }) {
  const at = q ? text.toLocaleLowerCase().indexOf(q.toLocaleLowerCase()) : -1
  if (at < 0) return text
  return (
    <>
      {text.slice(0, at)}
      <b className="font-semibold">{text.slice(at, at + q.length)}</b>
      {text.slice(at + q.length)}
    </>
  )
}

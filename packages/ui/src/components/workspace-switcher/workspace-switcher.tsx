import { Check, ChevronsUpDown, Plus, X } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { useId, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Sheet, SheetClose, SheetTitle } from '../../lib/sheet'
import { Avatar } from '../avatar'
import { Button } from '../button'
import { CountBadge } from '../count-badge'
import { MenuContent, MenuSeparator } from '../menu'

/** One workspace (one business at one address) the person works in. */
export interface WorkspaceItem {
  id: string
  name: string
  /** "Owner · Ashgabat": the person's level there and the city, never a street or district. */
  caption: string
  logo?: string | null
  /** The workspace on screen: tint and a check instead of a count. */
  current?: boolean
  /** Requests this person may answer there (the amber count). */
  count?: number
  /** What the count means, read after the row's name: "2 requests". */
  countLabel?: string
}

export interface WorkspaceSwitcherCopy {
  /** "Your workspaces": the list's label, the phone sheet's title. */
  title: string
  /** "Create a business". */
  create: string
  /** The trigger's name: "Workspace: Glow Studio, Owner. Switch". */
  trigger: string
  /** Read after the current row's name on the phone: "current workspace". */
  current: string
  /** The phone sheet: "Switching the workspace switches the calendar, clients and settings too." */
  note: string
  /** The phone sheet's close button. */
  close: string
}

/**
 * The only way to change workspace (DS-Patterns 06 · WorkspaceSwitcher; B-Shell, B-Mobile): the closed switcher shows the
 * workspace on screen (logo 36 r10 or its letter tile, name, the person's level, chevrons); `sidebar` and `rail` (the
 * logo alone in a 44 button) open the "Your workspaces" menu (300); `strip` (the phone's header) and `row` (the More
 * sheet's first row) a bottom sheet. Rows
 * are radio items: the current one in tint with a check, the others with their amber request count. Picking one, or
 * "Create a business", is the screen's to do (the address names the workspace).
 */
export function WorkspaceSwitcher({
  variant = 'sidebar',
  name,
  level,
  logo,
  items,
  person,
  copy,
  onSelect,
  onCreate,
  className,
}: {
  variant?: 'sidebar' | 'rail' | 'strip' | 'row'
  /** The workspace on screen and the person's level there. */
  name: string
  level: string
  logo?: string | null
  items: readonly WorkspaceItem[]
  /** Under the phone sheet's title: "Aýna Myradowa · +993 65 31 22 10". */
  person?: ReactNode
  copy: WorkspaceSwitcherCopy
  onSelect: (id: string) => void
  onCreate: () => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const titleId = useId()
  const current = items.find((i) => i.current)?.id ?? ''
  const mark = <WorkspaceLogo name={name} logo={logo} size={36} />
  const label = (
    <span className="flex min-w-0 flex-1 flex-col text-left">
      <span
        className={cn(
          'truncate font-semibold text-n-900',
          variant === 'strip' || variant === 'row' ? 'text-[15px] leading-5' : 'text-small',
        )}
      >
        {name}
      </span>{' '}
      <span className="truncate text-micro text-n-600">{level}</span>
    </span>
  )
  const trigger = cn(
    'flex cursor-pointer items-center rounded-m border-0 bg-transparent text-n-900 hover:bg-group focus-visible:shadow-focus focus-visible:outline-none data-[state=open]:bg-group',
    variant === 'rail' && 'size-11 flex-none justify-center',
    variant === 'sidebar' && 'w-full gap-2.5 p-2',
    variant === 'strip' && 'h-12 max-w-62.5 min-w-0 gap-2.5 py-1 pr-2.5 pl-1.5',
    variant === 'row' && 'm-0 min-h-15 w-full gap-3.5 rounded-s px-3 hover:bg-n-50 focus-visible:shadow-focus-inset',
    className,
  )
  const chevrons = <ChevronsUpDown aria-hidden className="size-4 flex-none text-n-500" />

  if (variant === 'strip' || variant === 'row')
    return (
      <>
        <button type="button" aria-haspopup="dialog" aria-label={copy.trigger} className={trigger} onClick={() => setOpen(true)}>
          {mark}
          {label}
          {chevrons}
        </button>
        <Sheet open={open} onOpenChange={setOpen} title={copy.title}>
          <div className="flex min-h-15 flex-none items-center gap-2 py-0 pr-1 pl-4">
            <div className="flex min-w-0 flex-1 flex-col">
              <SheetTitle className="m-0 text-[17px] leading-6 font-semibold tracking-[-0.01em] text-n-900">{copy.title}</SheetTitle>
              {person && <span className="text-dense text-n-600 tabular-nums">{person}</span>}
            </div>
            <SheetClose asChild>
              <Button variant="ghost" iconOnly aria-label={copy.close}>
                <X />
              </Button>
            </SheetClose>
          </div>
          <div className="flex flex-col gap-1 px-2 pt-1 pb-5">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-current={item.current || undefined}
                onClick={() => {
                  setOpen(false)
                  if (!item.current) onSelect(item.id)
                }}
                className={cn(
                  'flex min-h-16 w-full cursor-pointer items-center gap-3 rounded-m border-0 px-3 py-2 text-left text-n-900 hover:bg-n-50 focus-visible:shadow-focus-inset focus-visible:outline-none',
                  item.current ? 'bg-a-50 hover:bg-a-50' : 'bg-transparent',
                )}
              >
                <WorkspaceLogo name={item.name} logo={item.logo} size={40} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[15px] leading-5 font-semibold">{item.name}</span>
                  <span className="truncate text-dense text-n-600">{item.caption}</span>
                </span>
                <RowEnd item={item} currentLabel={copy.current} size={20} />
              </button>
            ))}
            <div role="separator" className="mx-3 my-1.5 h-px flex-none bg-n-200" />
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                onCreate()
              }}
              className="flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-m border-0 bg-transparent px-3 py-2 text-left text-[15px] leading-5 font-semibold text-n-900 hover:bg-n-50 focus-visible:shadow-focus-inset focus-visible:outline-none"
            >
              <AddTile size={40} />
              {copy.create}
            </button>
            <p className="mx-3 mt-1 mb-0 text-dense text-n-600">{copy.note}</p>
          </div>
        </Sheet>
      </>
    )

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger aria-label={copy.trigger} className={trigger}>
        {mark}
        {variant === 'sidebar' && (
          <>
            {label}
            {chevrons}
          </>
        )}
      </DropdownMenu.Trigger>
      <MenuContent
        aria-labelledby={titleId}
        side={variant === 'rail' ? 'right' : 'bottom'}
        align="start"
        sideOffset={variant === 'rail' ? 8 : 6}
        className="w-75"
      >
        <DropdownMenu.Label id={titleId} className="px-2.5 pt-2 pb-1.5 text-label text-n-500 uppercase">
          {copy.title}
        </DropdownMenu.Label>
        <DropdownMenu.RadioGroup value={current} onValueChange={(id) => id !== current && onSelect(id)}>
          {items.map((item) => (
            <DropdownMenu.RadioItem
              key={item.id}
              value={item.id}
              className={cn(
                'flex min-h-13 cursor-pointer items-center gap-2.5 rounded-input px-2.5 py-1.5 text-small text-n-900 outline-none select-none focus-visible:shadow-focus-inset',
                item.current ? 'bg-a-50' : 'data-highlighted:bg-group',
              )}
            >
              <WorkspaceLogo name={item.name} logo={item.logo} size={32} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-semibold">{item.name}</span>
                <span className="truncate text-micro text-n-600">{item.caption}</span>
              </span>
              <RowEnd item={item} size={18} />
            </DropdownMenu.RadioItem>
          ))}
        </DropdownMenu.RadioGroup>
        <MenuSeparator className="mx-1" />
        <DropdownMenu.Item
          onSelect={onCreate}
          className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-input px-2.5 py-1.5 text-small text-n-900 outline-none select-none focus-visible:shadow-focus-inset data-highlighted:bg-group"
        >
          <AddTile size={32} />
          {copy.create}
        </DropdownMenu.Item>
      </MenuContent>
    </DropdownMenu.Root>
  )
}

/** A workspace's logo, or its letter tile (Avatar square neutral, `.y-wlt`) without one; the name sits beside it. */
function WorkspaceLogo({ name, logo, size }: { name: string; logo?: string | null; size: 32 | 36 | 40 }) {
  return <Avatar decorative name={name} src={logo} size={size} shape="square" tone="neutral" letters={1} />
}

/** The current row's check (`a-600`, stroke 2), else the amber count of requests there. */
function RowEnd({ item, currentLabel, size }: { item: WorkspaceItem; currentLabel?: string; size: 18 | 20 }) {
  if (item.current)
    return (
      <>
        <Check aria-hidden strokeWidth={2} className={cn('flex-none text-a-600', size === 20 ? 'size-5' : 'size-4.5')} />
        {currentLabel && <span className="sr-only">{currentLabel}</span>}
      </>
    )
  if (!item.count) return null
  return (
    <>
      <CountBadge aria-hidden tone="attention">
        {item.count}
      </CountBadge>
      {item.countLabel && <span className="sr-only">{item.countLabel}</span>}
    </>
  )
}

/** "Create a business"'s dashed tile with a plus (`.y-wpl`, B-Shell's wins over B-Mobile's solid line). */
function AddTile({ size }: { size: 32 | 40 }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex flex-none items-center justify-center border border-dashed border-n-400 text-n-600',
        size === 40 ? 'size-10 rounded-s' : 'size-8 rounded-input',
      )}
    >
      <Plus className="size-4" />
    </span>
  )
}

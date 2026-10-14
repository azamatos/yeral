import { Tabs as TabsPrimitive } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** Underline tab look (DS `.tab`); also for link tabs (business page section nav). */
export const tabClass = cn(
  'relative -mb-px inline-flex h-11 cursor-pointer items-center border-0 border-b-2 border-transparent bg-transparent px-0.5 text-body font-medium whitespace-nowrap text-n-600 no-underline',
  'hover:text-n-900 focus-visible:rounded-[6px] focus-visible:shadow-focus focus-visible:outline-none',
  'data-[state=active]:border-a-500 data-[state=active]:font-semibold data-[state=active]:text-n-900',
  'aria-[current=page]:border-a-500 aria-[current=page]:font-semibold aria-[current=page]:text-n-900',
  'group',
)

export function Tabs(props: ComponentProps<typeof TabsPrimitive.Root>) {
  return <TabsPrimitive.Root {...props} />
}

export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List {...props} className={cn('flex [scrollbar-width:none] gap-8 overflow-x-auto border-b border-n-200', className)} />
  )
}

/** A tab; `count` shows the small pill after the label (Gelýän · 3). */
export function TabsTrigger({
  className,
  count,
  children,
  ...props
}: ComponentProps<typeof TabsPrimitive.Trigger> & { count?: ReactNode }) {
  return (
    <TabsPrimitive.Trigger {...props} className={cn(tabClass, className)}>
      {children}
      {count !== undefined && <TabCount>{count}</TabCount>}
    </TabsPrimitive.Trigger>
  )
}

export function TabCount({ children }: { children: ReactNode }) {
  return (
    <span className="ml-2 inline-flex h-5 min-w-5.5 items-center justify-center rounded-pill bg-n-100 px-1.5 text-micro font-semibold text-n-600 group-aria-[current=page]:bg-a-50 group-aria-[current=page]:text-a-600 group-data-[state=active]:bg-a-50 group-data-[state=active]:text-a-600">
      {children}
    </span>
  )
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content {...props} className={cn('outline-none focus-visible:shadow-focus', className)} />
}

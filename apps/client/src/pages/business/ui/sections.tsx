import { useNavigate } from '@tanstack/react-router'
import { cn } from '@yeral/ui/cn'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@yeral/ui/tabs'
import { useRef, type ReactNode } from 'react'
import { useTranslations } from 'use-intl'

/** The page's panels, in the tab bar's order (Venue v0.7 `BusinessTabs`): Services is the default. */
export const SECTIONS = ['services', 'specialists', 'reviews', 'about'] as const
export type SectionId = (typeof SECTIONS)[number]

/** `?tab=` as one of the page's panels; anything else (or a panel the page hasn't got) is Services. */
export function pickTab(tab: string | undefined, ids: readonly SectionId[]): SectionId {
  return ids.find((id) => id === tab) ?? 'services'
}

/** The search params that open a panel: Services, the default, keeps the address clean. */
export function tabSearch(id: SectionId) {
  return (prev: Record<string, unknown>) => ({ ...prev, tab: id === 'services' ? undefined : id })
}

/**
 * The tab bar and its panels (Venue v0.7 · C2 «Each tab is its own panel», the owner's #38): Services · Specialists ·
 * Reviews · About under the hero, each a panel of its own instead of anchors on one long page. Only the panel changes:
 * the hero, the bar and the booking card stay put. The open tab lives in `?tab=` (replaced, so Back leaves the page);
 * every panel is rendered (on the server too, for search engines) and the closed ones hidden, so each keeps its state
 * (the reviews loaded, the group picked) while another is open. The panel area keeps at least the window's height under
 * the bar, so a short panel never pulls the page up. Switching while the bar is stuck jumps (instantly) to where the
 * new panel starts right under it; otherwise the scroll stays. ← → Home End move between the tabs (Radix Tabs).
 * `--tabs-end`, where the stuck bar ends, is for whatever sticks under it or jumps up to it (the services' index and
 * rail): 16 + 44 (8 + 44 on the phone), under the page's 56 px bar on the phone (and up to 1024 with a cover).
 */
export function SectionTabs({
  ids,
  current,
  counts,
  label,
  belowBar,
  children,
}: {
  ids: readonly SectionId[]
  current: SectionId
  counts: Partial<Record<SectionId, number>>
  label: string
  /** A cover: up to 1024 the bar sticks under the cover's 56 px bar (the phone always has one, folded or not). */
  belowBar: boolean
  children: Record<SectionId, ReactNode>
}) {
  const t = useTranslations('business.sections')
  const navigate = useNavigate()
  const top = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const open = (value: string) => {
    const id = pickTab(value, ids)
    const mark = top.current
    const stuckAt = bar.current ? parseFloat(getComputedStyle(bar.current).top) || 0 : 0
    const y = mark?.getBoundingClientRect().top ?? 0
    // the bar is stuck: the new panel starts right under it, never in its middle
    if (y < stuckAt) scrollTo({ top: scrollY + y - stuckAt, behavior: 'instant' })
    void navigate({ to: '.', search: tabSearch(id), replace: true, resetScroll: false })
  }
  return (
    <Tabs
      value={current}
      onValueChange={open}
      className={cn('[--tabs-end:60px] max-sm:[--tabs-end:108px]', belowBar && 'max-md:[--tabs-end:116px]')}
    >
      <div ref={top} aria-hidden />
      <div ref={bar} className={cn('sticky top-0 z-10 bg-n-0 pt-4 max-sm:top-14 max-sm:pt-2', belowBar && 'max-md:top-14')}>
        <TabsList aria-label={label}>
          {ids.map((id) => (
            <TabsTrigger key={id} value={id} className="flex-none">
              <span id={`tab-${id}-label`}>{t(id)}</span>
              {/* «Services 100» is the tab's name too; phones show no counts */}
              {counts[id] ? <span className="ml-1.5 font-medium text-n-500 max-sm:hidden"> {counts[id]}</span> : null}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <div className="min-h-[calc(100dvh-var(--tabs-end))]">
        {ids.map((id) => (
          <TabsContent key={id} value={id} forceMount aria-labelledby={`tab-${id}-label`} className="data-[state=inactive]:hidden">
            {children[id]}
          </TabsContent>
        ))}
      </div>
    </Tabs>
  )
}

/**
 * A panel's content: 24 under the tab bar (Venue v0.7 `[role=tabpanel]` padding-top 24), its title for screen readers
 * and search engines only, since the tab above says it (the repeated section titles are gone, C2).
 */
export function Section({ id, title, children, className }: { id: SectionId; title: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section aria-labelledby={`${id}-title`} className={className ?? 'flex flex-col gap-5 pt-6 pb-12 max-sm:pb-10'}>
      <h2 id={`${id}-title`} className="sr-only">
        {title}
      </h2>
      {children}
    </section>
  )
}

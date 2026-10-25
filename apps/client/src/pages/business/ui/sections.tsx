import { cn } from '@yeral/ui/cn'
import { tabClass } from '@yeral/ui/tabs'
import { useEffect, useState, type MouseEvent, type ReactNode } from 'react'
import { useTranslations } from 'use-intl'

/** The page's parts the section nav leads to, in its order (Venue `.tabs`). */
export const SECTIONS = ['services', 'specialists', 'reviews', 'about'] as const
export type SectionId = (typeof SECTIONS)[number]

/** The sticky nav's height and a little air: a section scrolled to starts below it (Venue `.sect` 60). */
const UNDER_NAV = 61

/**
 * The part being read: the last one whose top has passed under the nav, or the last of all once the page can't scroll
 * further (a short last part never reaches the nav). Read once a frame while scrolling.
 */
function useCurrent(ids: readonly SectionId[]): SectionId | undefined {
  const [current, setCurrent] = useState(ids[0])
  const key = ids.join(' ')
  useEffect(() => {
    const parts = key.split(' ') as SectionId[]
    let frame = 0
    const read = () => {
      frame = 0
      const end = innerHeight + scrollY >= document.documentElement.scrollHeight - 2
      let at = parts[0]
      for (const id of parts) {
        const top = document.getElementById(id)?.getBoundingClientRect().top
        if (top !== undefined && (top <= UNDER_NAV || (end && top < innerHeight))) at = id
      }
      setCurrent(at)
    }
    const update = () => {
      if (!frame) frame = requestAnimationFrame(read)
    }
    read()
    addEventListener('scroll', update, { passive: true })
    addEventListener('resize', update, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      removeEventListener('scroll', update)
      removeEventListener('resize', update)
    }
  }, [key])
  return current
}

/**
 * A press on a link to a part of the page (the nav, «96 reviews»): scrolls there, smoothly unless motion is reduced,
 * and moves the focus into it, without a new entry in the history; without the part, the link's own `#` jump.
 */
export function goTo(id: SectionId) {
  return (e: MouseEvent) => {
    const part = document.getElementById(id)
    if (!part) return
    e.preventDefault()
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches
    part.scrollIntoView({ behavior: still ? 'auto' : 'smooth', block: 'start' })
    part.focus({ preventScroll: true })
  }
}

/**
 * The section nav (Venue `.tabs`, Mobile 4): Services · Specialists · Reviews · About, sticky at the top, the part being
 * read underlined. Links to the parts on the same page, so they work before the page's script; a press `goTo`es there.
 */
export function SectionNav({ ids }: { ids: readonly SectionId[] }) {
  const t = useTranslations('business.sections')
  const current = useCurrent(ids)
  return (
    <nav
      aria-label={t('label')}
      className="sticky top-0 z-5 flex [scrollbar-width:none] gap-7 overflow-x-auto border-b border-n-200 bg-n-0 max-sm:gap-6"
    >
      {ids.map((id) => (
        <a
          key={id}
          href={`#${id}`}
          aria-current={current === id ? 'true' : undefined}
          className={cn(
            tabClass,
            'flex-none aria-[current=true]:border-a-500 aria-[current=true]:font-semibold aria-[current=true]:text-n-900',
          )}
          onClick={goTo(id)}
        >
          {t(id)}
        </a>
      ))}
    </nav>
  )
}

/**
 * One part of the page under the nav (Venue `.sect`): its `h2` 26/32 700 (22/28 on phones), 48 above and below with a
 * line between parts (40 on phones), and it starts below the sticky nav when scrolled to.
 */
export function Section({
  id,
  title,
  first = false,
  children,
  className,
}: {
  id: SectionId
  title: ReactNode
  first?: boolean
  children: ReactNode
  className?: string
}) {
  const titleId = `${id}-title`
  return (
    <section
      id={id}
      aria-labelledby={titleId}
      tabIndex={-1}
      className={cn(
        'flex scroll-mt-15 flex-col gap-5 py-12 outline-none max-sm:py-10',
        first ? 'pt-8 max-sm:pt-6' : 'border-t border-n-200',
        className,
      )}
    >
      <h2 id={titleId} className="m-0 text-[26px] leading-8 font-bold tracking-[-0.02em] max-sm:text-[22px] max-sm:leading-7">
        {title}
      </h2>
      {children}
    </section>
  )
}

import { createContext, use, useEffect, useRef, type RefObject } from 'react'

/**
 * Whether a section opened inside the frame after its first one: set by <SettingsFrame> once it's on screen. The first
 * section leaves the focus to the top bar's «Settings» (a new page); a section opened from the menu after it takes the
 * focus on its own name, so a screen reader starts there and not at the same «Settings» again.
 */
export const SectionMoved = createContext<RefObject<boolean>>({ current: false })

/** The frame's side: false while its first section mounts (children's effects run first), true from then on. */
export function useSectionMovedRef(): RefObject<boolean> {
  const moved = useRef(false)
  useEffect(() => {
    moved.current = true
  }, [])
  return moved
}

/** The section's side: its title takes the focus when it opened after the frame's first section. */
export function useFocusWhenMoved(): RefObject<HTMLHeadingElement | null> {
  const moved = use(SectionMoved)
  const title = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (moved.current) title.current?.focus()
  }, [moved])
  return title
}

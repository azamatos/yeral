import { LucideProvider } from 'lucide-react'
import { Tooltip } from 'radix-ui'
import type { ReactNode } from 'react'

/** Wrap every app once: Lucide icons get the design's 1.75 stroke, tooltips share one delay. */
export function UIProvider({ children }: { children: ReactNode }) {
  return (
    <LucideProvider strokeWidth={1.75}>
      <Tooltip.Provider delayDuration={300}>{children}</Tooltip.Provider>
    </LucideProvider>
  )
}

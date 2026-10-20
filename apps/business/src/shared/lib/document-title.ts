import { useEffect } from 'react'

/** The tab's title, parts joined the way the design writes them: «Calendar · Glow Studio». */
export function useDocumentTitle(...parts: (string | null | undefined | false)[]) {
  const title = parts.filter(Boolean).join(' · ')
  useEffect(() => {
    document.title = title
  }, [title])
}

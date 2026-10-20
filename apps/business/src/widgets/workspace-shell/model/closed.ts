import { toast } from '@yeral/ui/toast'
import { translator } from '@/shared/i18n'

/**
 * "This section is closed to you" (design §27.1, B-Shell): a workspace that isn't the person's, or a section their level
 * doesn't have, opened by its address. Said once however many redirects lead here; the routes call it only for a real
 * navigation, never while a link is preloaded on hover.
 */
export function sectionClosed() {
  toast(translator()('shell.closed'), { id: 'section-closed' })
}

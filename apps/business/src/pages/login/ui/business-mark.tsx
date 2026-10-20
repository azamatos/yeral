import { Avatar } from '@yeral/ui/avatar'
import { cn } from '@yeral/ui/cn'

/** A workspace's logo: its photo, else its initials on the neutral tile (B-Login `.lg56`, `.lt56`, `.lg64`). */
export function BusinessMark({ name, photo, size = 56 }: { name: string; photo?: { url: string } | null; size?: 56 | 64 }) {
  return (
    <Avatar
      name={name}
      src={photo?.url}
      size={56}
      tone="neutral"
      className={cn('border border-n-200', size === 64 ? 'size-16 rounded-card text-[24px]' : 'rounded-l')}
    />
  )
}

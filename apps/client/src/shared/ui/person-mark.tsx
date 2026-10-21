import { Avatar } from '@yeral/ui/avatar'
import { cn } from '@yeral/ui/cn'
import { UserRound } from 'lucide-react'

const sizes = {
  32: { box: 'size-8', icon: 'size-4' },
  40: { box: 'size-10', icon: 'size-5' },
  56: { box: 'size-14', icon: 'size-6' },
} as const

/**
 * The signed-in person's mark (Auth's avatar, Account-Profile's `.av56`): the first name's initial on tint (the boards
 * draw «A» for Aýjemal), or a person icon until they have a name. Decorative: the name is said next to it.
 */
export function PersonMark({ firstName, size }: { firstName: string | null; size: keyof typeof sizes }) {
  if (firstName) return <Avatar name={firstName} size={size} aria-hidden />
  return (
    <span aria-hidden className={cn('inline-flex flex-none items-center justify-center rounded-pill bg-a-50 text-a-600', sizes[size].box)}>
      <UserRound className={sizes[size].icon} />
    </span>
  )
}

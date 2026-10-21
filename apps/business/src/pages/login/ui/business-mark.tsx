import { Avatar } from '@yeral/ui/avatar'

/** A workspace's logo, else its initials on the neutral tile (B-Login `.lg56`, `.lt56`, `.lg64`), square. */
export function BusinessMark({ name, logo, size = 56 }: { name: string; logo?: { url: string } | null; size?: 56 | 64 }) {
  return <Avatar name={name} src={logo?.url} size={size} shape="square" tone="neutral" className="border border-n-200" />
}

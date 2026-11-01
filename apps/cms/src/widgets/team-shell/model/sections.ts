import { Building2, MessageSquareWarning, Users, type LucideIcon } from 'lucide-react'

/** The tool's sections, in the sidebar's order. One role (Q-011): everyone sees all of them. */
export const SECTIONS = ['businesses', 'reviews', 'team'] as const
export type Section = (typeof SECTIONS)[number]

export const SECTION_ICONS: Record<Section, LucideIcon> = {
  businesses: Building2,
  reviews: MessageSquareWarning,
  team: Users,
}

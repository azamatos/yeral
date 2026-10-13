import { Brush, Droplets, Eye, Flower2, Hand, Palette, Scissors, type LucideProps } from 'lucide-react'
import type { CategoryId } from '@/domain/types'

const ICONS: Record<CategoryId, React.ComponentType<LucideProps>> = {
  barber: Scissors,
  hair: Brush,
  nails: Hand,
  brows: Eye,
  massage: Flower2,
  cosmetology: Droplets,
  makeup: Palette,
}

export const CATEGORY_ORDER: CategoryId[] = ['barber', 'hair', 'nails', 'brows', 'massage', 'cosmetology', 'makeup']

/** URL slugs for category landing pages (/ashgabat/barbershops) */
export const CATEGORY_SLUG: Record<CategoryId, string> = {
  barber: 'barbershops',
  hair: 'hair',
  nails: 'nails',
  brows: 'brows-lashes',
  massage: 'massage-spa',
  cosmetology: 'cosmetology',
  makeup: 'makeup',
}

export function CategoryIcon({ id, ...p }: { id: CategoryId } & LucideProps) {
  const I = ICONS[id]
  return <I strokeWidth={1.75} {...p} />
}

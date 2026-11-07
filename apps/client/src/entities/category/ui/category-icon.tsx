import { cn } from '@yeral/ui/cn'
import {
  Car,
  Coffee,
  Dumbbell,
  Flower2,
  GraduationCap,
  Hand,
  House,
  PawPrint,
  Scissors,
  Smile,
  Sparkles,
  Stethoscope,
  Store,
  Utensils,
  type LucideIcon,
} from 'lucide-react'

/** The catalogue's icon names, one by one: the whole icon set would come with the page otherwise. */
const ICONS: Record<string, LucideIcon> = {
  car: Car,
  coffee: Coffee,
  dumbbell: Dumbbell,
  'flower-2': Flower2,
  'graduation-cap': GraduationCap,
  hand: Hand,
  house: House,
  'paw-print': PawPrint,
  scissors: Scissors,
  smile: Smile,
  sparkles: Sparkles,
  stethoscope: Stethoscope,
  utensils: Utensils,
}

/** A category's icon (Home `.cat`, the search bar's chips); a new category from the CMS gets a plain one until it's listed here. */
export function CategoryIcon({ name, className }: { name: string | undefined; className?: string }) {
  const Icon = (name && ICONS[name]) || Store
  return <Icon aria-hidden className={cn('size-6 text-a-600', className)} />
}

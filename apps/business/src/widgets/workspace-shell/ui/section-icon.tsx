import { CalendarDays, List, Settings, Star, Users } from 'lucide-react'
import type { Section } from '../model/sections'

/** Each section's icon, as the sidebar, the rail, the tab bar and the More sheet draw it (B-Shell). */
export function SectionIcon({ section }: { section: Section }) {
  switch (section) {
    case 'calendar':
      return <CalendarDays />
    case 'bookings':
      return <List />
    case 'clients':
      return <Users />
    case 'reviews':
      return <Star />
    case 'settings':
      return <Settings />
  }
}

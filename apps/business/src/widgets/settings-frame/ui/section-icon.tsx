import { CalendarCheck, Clock, QrCode, ShieldCheck, Store, Tag, UserRound } from 'lucide-react'
import type { SettingsSection } from '../model/sections'

/** Each settings section's icon, as the menu draws it (B-Settings `.snav`). */
export function SettingsSectionIcon({ section }: { section: SettingsSection }) {
  switch (section) {
    case 'profile':
      return <Store />
    case 'rules':
      return <CalendarCheck />
    case 'hours':
      return <Clock />
    case 'services':
      return <Tag />
    case 'team':
      return <UserRound />
    case 'permissions':
      return <ShieldCheck />
    case 'link':
      return <QrCode />
  }
}

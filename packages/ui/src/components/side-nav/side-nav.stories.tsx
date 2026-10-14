/** App sidebar · 248 — business workspace navigation (DS-Components → Navigation). */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { BarChart3, CalendarDays, CircleHelp, ClipboardList, Scissors, Settings, Users, UsersRound } from 'lucide-react'
import { Logo } from '../../brand'
import { CountBadge } from '../count-badge'
import { SideNav, SideNavDivider, SideNavItem } from './side-nav'

function Sidebar() {
  return (
    <aside className="flex w-62 flex-col gap-0.5 rounded-card border border-n-200 px-3 py-4">
      <div className="flex items-center gap-2.5 px-2 pt-1 pb-3.5">
        <Logo variant="icon" height={32} alt="" className="rounded-input" />
        <div className="flex flex-col">
          <span className="text-small font-semibold">Barber Loft</span>
          <span className="text-micro text-n-600">Dellekhana · Köpetdag</span>
        </div>
      </div>
      <SideNav aria-label="Esasy">
        <SideNavItem href="#calendar" aria-current="page">
          <CalendarDays />
          Senenama
        </SideNavItem>
        <SideNavItem href="#bookings" trailing={<CountBadge tone="attention">3</CountBadge>}>
          <ClipboardList />
          Ýazylyşlar
        </SideNavItem>
        <SideNavItem href="#clients">
          <Users />
          Müşderiler
        </SideNavItem>
        <SideNavItem href="#services">
          <Scissors />
          Hyzmatlar
        </SideNavItem>
        <SideNavItem href="#team">
          <UsersRound />
          Topar
        </SideNavItem>
        <SideNavItem href="#reports">
          <BarChart3 />
          Hasabatlar
        </SideNavItem>
        <SideNavDivider />
        <SideNavItem href="#settings">
          <Settings />
          Sazlamalar
        </SideNavItem>
        <SideNavItem href="#help">
          <CircleHelp />
          Kömek
        </SideNavItem>
      </SideNav>
    </aside>
  )
}

const meta = { title: 'Navigation/Sidebar', component: Sidebar } satisfies Meta<typeof Sidebar>
export default meta
type Story = StoryObj<typeof meta>
export const Business: Story = {}

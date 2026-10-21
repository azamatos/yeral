/**
 * Navigation/Sidebar — the business app's sidebar (DS-Patterns 06 · SideNav; B-Shell): the workspace switcher on top,
 * Calendar · Bookings · Clients · Reviews · Settings, the person at the bottom. 248 full from 1024, the 72 rail below
 * (icons in 44 buttons, names in tooltips, counts as dots). Items a level can't use are removed, not disabled: a
 * Specialist has no Settings and no reviews count. English as the boards; RussianLength checks ~30% longer words.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { CalendarDays, LogOut, Eye, List, Settings, Star, User, Users, ExternalLink } from 'lucide-react'
import { expect, userEvent, within } from 'storybook/test'
import { brand } from '../../brand'
import { AccountMenu, type AccountMenuItem } from '../account-menu'
import { WorkspaceSwitcher, type WorkspaceItem } from '../workspace-switcher'
import { SideNav, SideNavDivider, SideNavItem, type SideNavCount } from './side-nav'

interface Words {
  menu: string
  items: { calendar: string; bookings: string; clients: string; reviews: string; settings: string }
  requests: (n: number) => string
  reviews: (n: number) => string
  account: { profile: string; page: string; client: string; logout: string; menu: string; trigger: string }
  switcher: { title: string; create: string; current: string; note: string; close: string }
  levels: { owner: string; admin: string; specialist: string }
}

const EN: Words = {
  menu: 'Main menu',
  items: { calendar: 'Calendar', bookings: 'Bookings', clients: 'Clients', reviews: 'Reviews', settings: 'Settings' },
  requests: (n) => `${n} requests`,
  reviews: (n) => `${n} unanswered reviews`,
  account: {
    profile: 'My profile',
    page: 'Your Ýeral page',
    client: 'Open as a client',
    logout: 'Log out',
    menu: 'Account',
    trigger: 'Account menu',
  },
  switcher: {
    title: 'Your workspaces',
    create: 'Create a business',
    current: 'current workspace',
    note: 'Switching the workspace switches the calendar, clients and settings too.',
    close: 'Close',
  },
  levels: { owner: 'Owner', admin: 'Admin', specialist: 'Specialist' },
}

// the board's Russian (Long-text check, DS-Patterns 09)
const RU: Words = {
  menu: 'Главное меню',
  items: { calendar: 'Календарь', bookings: 'Записи', clients: 'Клиенты', reviews: 'Отзывы', settings: 'Настройки' },
  requests: (n) => `${n} заявок`,
  reviews: (n) => `${n} отзыва без ответа`,
  account: {
    profile: 'Мой профиль',
    page: 'Ваша страница на Ýeral',
    client: 'Открыть как клиент',
    logout: 'Выйти',
    menu: 'Аккаунт',
    trigger: 'Меню аккаунта',
  },
  switcher: {
    title: 'Ваши рабочие места',
    create: 'Создать бизнес',
    current: 'текущее рабочее место',
    note: 'При смене рабочего места меняются и календарь, и клиенты, и настройки.',
    close: 'Закрыть',
  },
  levels: { owner: 'Владелец', admin: 'Администратор', specialist: 'Специалист' },
}

type Level = keyof Words['levels']

function Sidebar({
  level = 'owner',
  collapsed = false,
  words = EN,
  requests = 6,
  reviews = 4,
}: {
  level?: Level
  collapsed?: boolean
  words?: Words
  requests?: number
  reviews?: number
}) {
  const w = words
  const items: WorkspaceItem[] = [
    { id: 'glow-studio', name: 'Glow Studio', caption: `${w.levels[level]} · Ashgabat`, logo: brand.icon, current: true },
    {
      id: 'glow-nails',
      name: 'Glow Nails',
      caption: `${w.levels.owner} · Ashgabat`,
      logo: brand.icon,
      count: { count: 2, label: w.requests(2) },
    },
  ]
  const account: AccountMenuItem[] = [
    { id: 'profile', label: w.account.profile, icon: <User /> },
    { id: 'page', label: w.account.page, icon: <Eye /> },
    { id: 'client', label: w.account.client, icon: <ExternalLink />, hint: 'yeral.app' },
    { id: 'logout', label: w.account.logout, icon: <LogOut />, danger: true },
  ]
  const requestsCount: SideNavCount = { count: requests, tone: 'attention', label: w.requests(requests) }
  const reviewsCount: SideNavCount = { count: reviews, tone: 'muted', label: w.reviews(reviews) }
  const variant = collapsed ? 'rail' : 'sidebar'
  return (
    <aside
      className={
        collapsed
          ? 'flex h-180 w-18 flex-col items-center gap-1.5 rounded-card border border-n-200 py-3'
          : 'flex h-180 w-62 flex-col gap-0.5 rounded-card border border-n-200 p-3'
      }
    >
      <WorkspaceSwitcher
        variant={variant}
        name="Glow Studio"
        level={w.levels[level]}
        logo={brand.icon}
        items={items}
        copy={{ ...w.switcher, trigger: `Workspace: Glow Studio, ${w.levels[level]}. Switch` }}
        onSelect={() => undefined}
        onCreate={() => undefined}
        className={collapsed ? 'mb-2' : undefined}
      />
      {!collapsed && <SideNavDivider />}
      <SideNav aria-label={w.menu} collapsed={collapsed}>
        <SideNavItem href="#calendar" aria-current="page" icon={<CalendarDays />} label={w.items.calendar} />
        <SideNavItem
          href="#bookings"
          icon={<List />}
          label={w.items.bookings}
          count={level === 'specialist' ? { ...requestsCount, count: 2, label: w.requests(2) } : requestsCount}
        />
        <SideNavItem href="#clients" icon={<Users />} label={w.items.clients} />
        <SideNavItem href="#reviews" icon={<Star />} label={w.items.reviews} count={level === 'specialist' ? null : reviewsCount} />
        {level !== 'specialist' && <SideNavItem href="#settings" icon={<Settings />} label={w.items.settings} />}
      </SideNav>
      <div className="flex-1" />
      {!collapsed && <SideNavDivider />}
      <AccountMenu
        variant={collapsed ? 'rail' : 'block'}
        name="Maýsa Annaýewa"
        phone="+993 65 10 20 30"
        items={account}
        menuLabel={w.account.menu}
        triggerLabel={collapsed ? `${w.account.trigger}: Maýsa Annaýewa` : w.account.trigger}
        className={collapsed ? undefined : 'self-stretch'}
      />
    </aside>
  )
}

const meta = {
  title: 'Navigation/Sidebar',
  component: Sidebar,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Sidebar>
export default meta
type Story = StoryObj<typeof meta>

/** Owner: every item, the requests (amber) and unanswered reviews (muted) counts; the current page in tint. */
export const Business: Story = {
  play: async ({ canvas }) => {
    const nav = canvas.getByRole('navigation', { name: 'Main menu' })
    await expect(within(nav).getByRole('link', { name: 'Calendar' })).toHaveAttribute('aria-current', 'page')
    await expect(within(nav).getByRole('link', { name: 'Bookings 6 requests' })).toBeVisible()
    await expect(within(nav).getByRole('link', { name: 'Reviews 4 unanswered reviews' })).toBeVisible()
    await userEvent.tab()
    await expect(canvas.getByRole('button', { name: 'Workspace: Glow Studio, Owner. Switch' })).toHaveFocus()
    await userEvent.tab()
    await expect(within(nav).getByRole('link', { name: 'Calendar' })).toHaveFocus()
  },
}

/** Admin: the same items (the Team page is view-only inside Settings). */
export const RoleAdmin: Story = { args: { level: 'admin' } }

/** Specialist: Settings is removed (not disabled), Reviews has no count, Bookings counts her own requests. */
export const RoleSpecialist: Story = {
  args: { level: 'specialist' },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('link', { name: /Settings/ })).not.toBeInTheDocument()
    await expect(canvas.getByRole('link', { name: 'Reviews' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Bookings 2 requests' })).toBeVisible()
  },
}

/** No requests and no unanswered reviews: no counts at all. */
export const NoCounts: Story = { args: { requests: 0, reviews: 0 } }

/** A hundred requests: the count stops at 99+. */
export const ManyRequests: Story = { args: { requests: 120 } }

/** Rail (768–1023): icons in 44 buttons, dots for the counts, the names in tooltips (ink, right, 8 gap). */
export const Rail: Story = {
  args: { collapsed: true },
  play: async ({ canvas }) => {
    const bookings = canvas.getByRole('link', { name: 'Bookings 6 requests' })
    await userEvent.hover(bookings)
    await expect(await within(document.body).findByRole('tooltip')).toHaveTextContent('Bookings · 6 requests')
    await expect(canvas.getByRole('button', { name: 'Account menu: Maýsa Annaýewa' })).toBeVisible()
  },
}

/** Russian, ~30% longer: names wrap to two lines before they're cut; nothing has a fixed width. */
export const RussianLength: Story = { args: { words: RU } }

export const RussianRail: Story = { args: { words: RU, collapsed: true } }

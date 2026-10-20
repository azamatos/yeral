/**
 * Navigation/BottomTabBar (DS-Patterns 06; B-Mobile): the business app's main menu under 768. Calendar · Bookings (the
 * requests this person may answer, amber) · Clients · More; 64 plus the safe area, items 63 high, labels 11/14 600, the
 * current page in accent, an inset focus ring. More stays in accent while its sheet is open.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { CalendarDays, List, Menu, Users } from 'lucide-react'
import { expect, userEvent, within } from 'storybook/test'
import { BottomTab, BottomTabBar, BottomTabButton } from './bottom-tab-bar'

function Bar({
  requests = 6,
  moreOpen = false,
  current = !moreOpen,
  words = { menu: 'Main menu', calendar: 'Calendar', bookings: 'Bookings', clients: 'Clients', more: 'More', requests: 'requests' },
}: {
  requests?: number
  moreOpen?: boolean
  /** The calendar is the page on screen. */
  current?: boolean
  words?: Record<'menu' | 'calendar' | 'bookings' | 'clients' | 'more' | 'requests', string>
}) {
  return (
    <div className="w-97.5 rounded-m border border-n-200">
      <BottomTabBar aria-label={words.menu}>
        <BottomTab href="#calendar" aria-current={current ? 'page' : undefined} icon={<CalendarDays />} label={words.calendar} />
        <BottomTab
          href="#bookings"
          icon={<List />}
          label={words.bookings}
          count={{ count: requests, label: `${requests} ${words.requests}` }}
        />
        <BottomTab href="#clients" icon={<Users />} label={words.clients} />
        <BottomTabButton icon={<Menu />} label={words.more} aria-expanded={moreOpen} />
      </BottomTabBar>
    </div>
  )
}

const meta = {
  title: 'Navigation/BottomTabBar',
  component: Bar,
  globals: { viewport: { value: 'xs' } },
} satisfies Meta<typeof Bar>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    const nav = canvas.getByRole('navigation', { name: 'Main menu' })
    await expect(within(nav).getByRole('link', { name: 'Calendar' })).toHaveAttribute('aria-current', 'page')
    await expect(within(nav).getByRole('link', { name: 'Bookings 6 requests' })).toBeVisible()
    await expect(within(nav).getByRole('button', { name: 'More' })).toHaveAttribute('aria-haspopup', 'dialog')
    await userEvent.tab()
    await expect(within(nav).getByRole('link', { name: 'Calendar' })).toHaveFocus()
  },
}

export const NoRequests: Story = { args: { requests: 0 } }

export const ManyRequests: Story = {
  args: { requests: 120 },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('99+')).toBeVisible()
  },
}

/** More open: More alone in accent (the page underneath stays current for screen readers), the sheet above. */
export const MoreOpen: Story = {
  args: { moreOpen: true, current: true },
  play: async ({ canvas }) => {
    const calendar = canvas.getByRole('link', { name: 'Calendar' })
    await expect(calendar).toHaveAttribute('aria-current', 'page')
    await expect(getComputedStyle(calendar).color).toBe('rgb(90, 90, 100)')
    await expect(getComputedStyle(canvas.getByRole('button', { name: 'More' })).color).toBe('rgb(68, 41, 214)')
  },
}

/** Russian on a 320 phone: labels wrap to two lines before they're cut. */
export const RussianLength: Story = {
  args: {
    words: { menu: 'Главное меню', calendar: 'Календарь', bookings: 'Записи', clients: 'Клиенты', more: 'Ещё', requests: 'заявок' },
  },
  decorators: [(Story) => <div className="w-80 [&>div]:w-full">{Story()}</div>],
}

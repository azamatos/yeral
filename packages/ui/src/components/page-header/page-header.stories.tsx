/**
 * Navigation/PageHeader (DS-Patterns → «Page headers»): tabs with counts under the top bar, a drill-down (back, avatar,
 * title, subtitle, a link), a client page (H1 32 + tabs).
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { CalendarDays } from 'lucide-react'
import { expect, within } from 'storybook/test'
import { Avatar } from '../avatar'
import { BackLink } from '../back-link'
import { Button } from '../button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../tabs'
import { PageHeader } from './page-header'

const meta = { title: 'Navigation/PageHeader', component: PageHeader } satisfies Meta<typeof PageHeader>
export default meta
type Story = StoryObj<typeof meta>

/** Under the business app's top bar (which holds the title): the tabs with their counts. */
export const WithTabs: Story = {
  render: () => (
    <Tabs defaultValue="requests" className="max-w-180">
      <PageHeader
        tabs={
          <TabsList aria-label="Bookings">
            <TabsTrigger value="requests" count={6}>
              Requests
            </TabsTrigger>
            <TabsTrigger value="today" count={16}>
              Today
            </TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>
        }
      />
      {['requests', 'today', 'upcoming', 'past'].map((v) => (
        <TabsContent key={v} value={v} className="pt-6 text-small text-n-600">
          {v}
        </TabsContent>
      ))}
    </Tabs>
  ),
}

/** A drill-down: back to the list, the avatar 48, the name with the specialization, a link at the right. */
export const DrillDown: Story = {
  render: () => (
    <PageHeader
      className="max-w-180"
      level={2}
      back={<BackLink href="#team">Specialists</BackLink>}
      avatar={<Avatar name="Aýna Myradowa" size={48} />}
      title="Aýna Myradowa"
      subtitle="Stylist"
      actions={
        <Button asChild variant="ghost" size="s">
          <a href="#calendar">
            <CalendarDays aria-hidden />
            Open her calendar
          </a>
        </Button>
      }
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('heading', { level: 2, name: 'Aýna Myradowa' })).toBeVisible()
    await expect(canvas.getByRole('link', { name: 'Specialists' })).toBeVisible()
  },
}

/** A client page: the H1 and the tabs 20 under it. */
export const Client: Story = {
  render: () => (
    <Tabs defaultValue="upcoming" className="max-w-180">
      <PageHeader
        title="My bookings"
        tabs={
          <TabsList aria-label="Bookings">
            <TabsTrigger value="upcoming" count={3}>
              Upcoming
            </TabsTrigger>
            <TabsTrigger value="past" count={5}>
              Past
            </TabsTrigger>
          </TabsList>
        }
      />
      {['upcoming', 'past'].map((v) => (
        <TabsContent key={v} value={v} className="pt-6 text-small text-n-600">
          {v}
        </TabsContent>
      ))}
    </Tabs>
  ),
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('heading', { level: 1, name: 'My bookings' })).toBeVisible()
  },
}

/** Russian-length words. */
export const Russian: Story = {
  render: () => (
    <PageHeader
      className="max-w-120"
      level={2}
      back={<BackLink href="#team">Все специалисты</BackLink>}
      avatar={<Avatar name="Айна Мырадова" size={48} />}
      title="Айна Мырадова"
      subtitle="Стилист-колорист"
      actions={
        <Button variant="ghost" size="s">
          Открыть её календарь
        </Button>
      }
    />
  ),
}

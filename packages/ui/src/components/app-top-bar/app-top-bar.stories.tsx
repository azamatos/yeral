/**
 * Navigation/AppTopBar (DS-Patterns 06; B-Shell `.top`, B-Mobile `.mh`): the page's title (h1) and one primary action. 64
 * from 1024 (22/28), 56 on a tablet (19/24, the primary as an icon) and a phone (22/28, actions as ghost 44 icons); on
 * the phone's calendar the workspace switcher strip takes the title's place. No global search at the first release.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { CircleHelp, ListFilter, Plus, Search } from 'lucide-react'
import { expect, waitFor } from 'storybook/test'
import { brand } from '../../brand'
import { Button } from '../button'
import { WorkspaceSwitcher } from '../workspace-switcher'
import { AppTopBar } from './app-top-bar'

const meta = {
  title: 'Navigation/AppTopBar',
  component: AppTopBar,
  parameters: { layout: 'fullscreen' },
  args: {
    title: 'Bookings',
    actions: (
      <Button size="s">
        <Plus />
        New booking
      </Button>
    ),
  },
} satisfies Meta<typeof AppTopBar>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  globals: { viewport: { value: 'xl' } },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'Bookings' })).toBeVisible()
  },
}

/** A new page (`focusKey`, its address): the title takes focus, so a screen reader starts there. */
export const FocusOnNewPage: Story = {
  globals: { viewport: { value: 'xl' } },
  args: { focusKey: '/w/glow-studio/bookings' },
  play: async ({ canvas }) => {
    await waitFor(() => expect(canvas.getByRole('heading', { level: 1, name: 'Bookings' })).toHaveFocus())
  },
}

/** Tablet 768–1023: 56, title 19/24, the primary as a 36 icon button. */
export const Tablet: Story = {
  globals: { viewport: { value: 'sm' } },
  args: {
    title: 'Calendar',
    actions: (
      <Button size="s" iconOnly aria-label="New booking">
        <Plus />
      </Button>
    ),
  },
}

/** Phone, the calendar: the switcher strip and "Colours and symbols"; the title stays for screen readers. */
export const PhoneSwitcher: Story = {
  globals: { viewport: { value: 'xs' } },
  args: {
    title: 'Calendar',
    leading: (
      <WorkspaceSwitcher
        variant="strip"
        name="Glow Studio"
        level="Owner"
        logo={brand.icon}
        items={[{ id: 'glow-studio', name: 'Glow Studio', caption: 'Owner · Ashgabat', logo: brand.icon, current: true }]}
        copy={{
          title: 'Your workspaces',
          create: 'Create a business',
          trigger: 'Workspace: Glow Studio, Owner. Switch',
          current: 'current workspace',
          note: 'Switching the workspace switches the calendar, clients and settings too.',
          close: 'Close',
        }}
        onSelect={() => undefined}
        onCreate={() => undefined}
      />
    ),
    actions: (
      <Button variant="ghost" iconOnly aria-label="Colours and symbols" aria-haspopup="dialog">
        <CircleHelp />
      </Button>
    ),
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 1, name: 'Calendar' })).toBeInTheDocument()
    await expect(canvas.getByRole('button', { name: 'Workspace: Glow Studio, Owner. Switch' })).toBeVisible()
  },
}

/** Phone, other pages: the title 22/28 and the page's actions as ghost 44 icons. */
export const PhoneTitle: Story = {
  globals: { viewport: { value: 'xs' } },
  args: {
    actions: (
      <>
        <Button variant="ghost" iconOnly aria-label="Search bookings">
          <Search />
        </Button>
        <Button variant="ghost" iconOnly aria-label="Filters">
          <ListFilter />
        </Button>
      </>
    ),
  },
}

/** Russian, ~30% longer: a long title is cut, the actions keep their place. */
export const RussianLength: Story = {
  globals: { viewport: { value: 'md' } },
  args: {
    title: 'Записи и заявки на эту неделю',
    actions: (
      <Button size="s">
        <Plus />
        Новая запись
      </Button>
    ),
  },
}

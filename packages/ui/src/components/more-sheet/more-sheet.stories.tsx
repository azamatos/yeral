/**
 * Navigation/MoreSheet (DS-Patterns 06; B-Mobile frame 7): the phone's More, a sheet above the tab bar. The workspace row
 * (it opens the switcher's sheet) · Reviews (muted count) · Settings · the person · My profile · Your Ýeral page · Open as
 * a client · Log out. Rows a level can't use are removed: a Specialist has no Settings and no reviews count.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { ExternalLink, Eye, LogOut, Settings, Star, User } from 'lucide-react'
import { useState } from 'react'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { brand } from '../../brand'
import { WorkspaceSwitcher } from '../workspace-switcher'
import { MoreSheet, MoreSheetDivider, MoreSheetPerson, MoreSheetRow } from './more-sheet'

const onLogout = fn()

function More({
  level = 'Owner',
  russian = false,
  startOpen = true,
}: {
  level?: 'Owner' | 'Admin' | 'Specialist'
  russian?: boolean
  startOpen?: boolean
}) {
  const [open, setOpen] = useState(startOpen)
  const w = russian
    ? {
        more: 'Ещё',
        reviews: 'Отзывы',
        settings: 'Настройки',
        profile: 'Мой профиль',
        page: 'Ваша страница на Ýeral',
        client: 'Открыть как клиент',
        logout: 'Выйти',
        unanswered: '4 отзыва без ответа',
      }
    : {
        more: 'More',
        reviews: 'Reviews',
        settings: 'Settings',
        profile: 'My profile',
        page: 'Your Ýeral page',
        client: 'Open as a client',
        logout: 'Log out',
        unanswered: '4 unanswered',
      }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        {w.more}
      </button>
      <MoreSheet open={open} onOpenChange={setOpen} label={w.more}>
        <WorkspaceSwitcher
          variant="row"
          name="Glow Studio"
          level={level}
          logo={brand.icon}
          items={[{ id: 'glow-studio', name: 'Glow Studio', caption: `${level} · Ashgabat`, logo: brand.icon, current: true }]}
          copy={{
            title: 'Your workspaces',
            create: 'Create a business',
            trigger: `Workspace: Glow Studio, ${level}. Switch`,
            current: 'current workspace',
            note: 'Switching the workspace switches the calendar, clients and settings too.',
            close: 'Close',
          }}
          onSelect={() => undefined}
          onCreate={() => undefined}
        />
        <MoreSheetDivider />
        <MoreSheetRow
          icon={<Star />}
          label={w.reviews}
          drill
          count={level === 'Specialist' ? null : { count: 4, tone: 'muted', label: w.unanswered }}
        />
        {level !== 'Specialist' && <MoreSheetRow icon={<Settings />} label={w.settings} drill />}
        <MoreSheetDivider />
        <MoreSheetPerson name="Maýsa Annaýewa" phone="+993 65 10 20 30" />
        <MoreSheetRow icon={<User />} label={w.profile} drill />
        <MoreSheetRow icon={<Eye />} label={w.page} />
        <MoreSheetRow icon={<ExternalLink />} label={w.client} hint="yeral.app" />
        <MoreSheetRow icon={<LogOut />} label={w.logout} danger onClick={onLogout} />
      </MoreSheet>
    </>
  )
}

const meta = {
  title: 'Navigation/MoreSheet',
  component: More,
  globals: { viewport: { value: 'xs' } },
} satisfies Meta<typeof More>
export default meta
type Story = StoryObj<typeof meta>

export const Owner: Story = {
  play: async () => {
    const sheet = await within(document.body).findByRole('dialog', { name: 'More' })
    await expect(within(sheet).getByRole('button', { name: 'Reviews 4 unanswered' })).toBeVisible()
    await expect(within(sheet).getByRole('button', { name: 'Settings' })).toBeVisible()
    await userEvent.click(within(sheet).getByRole('button', { name: 'Log out' }))
    await expect(onLogout).toHaveBeenCalled()
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(within(document.body).queryByRole('dialog')).not.toBeInTheDocument())
  },
}

export const Admin: Story = { args: { level: 'Admin' } }

/** Specialist: no Settings row, Reviews without a count. */
export const Specialist: Story = {
  args: { level: 'Specialist' },
  play: async () => {
    const sheet = await within(document.body).findByRole('dialog', { name: 'More' })
    await expect(within(sheet).queryByRole('button', { name: /Settings/ })).not.toBeInTheDocument()
    await expect(within(sheet).getByRole('button', { name: 'Reviews' })).toBeVisible()
    await userEvent.keyboard('{Escape}')
  },
}

/** The workspace row opens the switcher's sheet over this one. */
export const WorkspaceRow: Story = {
  play: async () => {
    const sheet = await within(document.body).findByRole('dialog', { name: 'More' })
    await userEvent.click(within(sheet).getByRole('button', { name: 'Workspace: Glow Studio, Owner. Switch' }))
    await expect(await within(document.body).findByRole('dialog', { name: 'Your workspaces' })).toBeVisible()
    await userEvent.keyboard('{Escape}')
    await userEvent.keyboard('{Escape}')
  },
}

export const RussianLength: Story = { args: { russian: true } }

/** Opened from More (outside the sheet, as the tab bar's button is): closing it puts the focus back there. */
export const FocusBack: Story = {
  args: { startOpen: false },
  play: async ({ canvas }) => {
    const more = canvas.getByRole('button', { name: 'More' })
    await userEvent.click(more)
    await within(document.body).findByRole('dialog', { name: 'More' })
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(more).toHaveFocus())
  },
}

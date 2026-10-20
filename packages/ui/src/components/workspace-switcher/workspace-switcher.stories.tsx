/**
 * Navigation/WorkspaceSwitcher (DS-Patterns 06; B-Shell, B-Mobile frame 6): the only way to change workspace. Closed (logo
 * or letter tile, name, level, chevrons) → "Your workspaces" (300, rows "level · city", the current one in tint with a
 * check, the others with their amber request count, "Create a business"); the rail's logo button; the phone's header
 * strip and its sheet. Demo people: Maýsa owns two workspaces; Aýna is a Specialist at Glow Studio and owns her own.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { brand } from '../../brand'
import { WorkspaceSwitcher, type WorkspaceItem, type WorkspaceSwitcherCopy } from './workspace-switcher'

const COPY: WorkspaceSwitcherCopy = {
  title: 'Your workspaces',
  create: 'Create a business',
  trigger: 'Workspace: Glow Studio, Owner. Switch',
  current: 'current workspace',
  note: 'Switching the workspace switches the calendar, clients and settings too.',
  close: 'Close',
}

const MAYSA: WorkspaceItem[] = [
  { id: 'glow-studio', name: 'Glow Studio', caption: 'Owner · Ashgabat', logo: brand.icon, current: true },
  { id: 'glow-nails', name: 'Glow Nails', caption: 'Owner · Ashgabat', logo: brand.icon, count: 2, countLabel: '2 requests' },
]

const AYNA: WorkspaceItem[] = [
  { id: 'glow-studio', name: 'Glow Studio', caption: 'Specialist · Ashgabat', logo: brand.icon, current: true },
  { id: 'ayna-studio', name: 'Aýnanyň saç studiýasy', caption: 'Owner · Ashgabat', count: 1, countLabel: '1 request' },
]

const meta = {
  title: 'Navigation/WorkspaceSwitcher',
  component: WorkspaceSwitcher,
  args: {
    name: 'Glow Studio',
    level: 'Owner',
    logo: brand.icon,
    items: MAYSA,
    copy: COPY,
    onSelect: fn(),
    onCreate: fn(),
    className: 'w-68',
  },
} satisfies Meta<typeof WorkspaceSwitcher>
export default meta
type Story = StoryObj<typeof meta>

export const Closed: Story = {}

/** Open: Maýsa, Owner in both; the other workspace has 2 requests she may answer. Picking it is the screen's to do. */
export const Open: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Workspace: Glow Studio, Owner. Switch' }))
    const menu = await within(document.body).findByRole('menu', { name: 'Your workspaces' })
    const current = within(menu).getByRole('menuitemradio', { name: /^Glow Studio/, checked: true })
    await waitFor(() => expect(current).toBeVisible())
    // the current one is already open: nothing to do
    await userEvent.keyboard('{ArrowDown}{Enter}')
    await expect(args.onSelect).not.toHaveBeenCalled()
    await userEvent.click(canvas.getByRole('button', { name: 'Workspace: Glow Studio, Owner. Switch' }))
    await waitFor(() => expect(within(document.body).getByRole('menu', { name: 'Your workspaces' })).toBeVisible())
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    await expect(args.onSelect).toHaveBeenCalledWith('glow-nails')
  },
}

/** "Create a business" (B-10): the wizard from step 2, the screen's to open. */
export const Create: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Switch/ }))
    await userEvent.click(await within(document.body).findByRole('menuitem', { name: 'Create a business' }))
    await expect(args.onCreate).toHaveBeenCalled()
  },
}

/** Aýna: a Specialist here, the Owner of her own studio (no logo: its letter tile). */
export const SpecialistAndSolo: Story = {
  args: { level: 'Specialist', items: AYNA, copy: { ...COPY, trigger: 'Workspace: Glow Studio, Specialist. Switch' } },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Switch/ }))
    const own = await within(document.body).findByRole('menuitemradio', { name: /Aýnanyň saç studiýasy.*1 request/ })
    await waitFor(() => expect(own).toBeVisible())
    await userEvent.keyboard('{Escape}')
  },
}

/** A workspace without a logo, closed: the letter tile 36 r10. */
export const LetterTile: Story = {
  args: { name: 'Aýnanyň saç studiýasy', logo: null, copy: { ...COPY, trigger: 'Workspace: Aýnanyň saç studiýasy, Owner. Switch' } },
}

/** Rail (768–1023): the logo alone in a 44 button; the list opens to the right. */
export const Rail: Story = {
  args: { variant: 'rail', className: undefined },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Workspace: Glow Studio, Owner. Switch' }))
    const menu = await within(document.body).findByRole('menu', { name: 'Your workspaces' })
    await waitFor(() => expect(menu).toBeVisible())
    await userEvent.keyboard('{Escape}')
  },
}

/** Phone: the header strip (48, name 15/20) opens a bottom sheet with rows 64 and a note. */
export const PhoneSheet: Story = {
  args: {
    variant: 'strip',
    className: undefined,
    items: AYNA,
    level: 'Specialist',
    person: 'Aýna Myradowa · +993 65 31 22 10',
    copy: { ...COPY, trigger: 'Workspace: Glow Studio, Specialist. Switch' },
  },
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas, args }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Switch/ }))
    const sheet = await within(document.body).findByRole('dialog', { name: 'Your workspaces' })
    await expect(within(sheet).getByText('Aýna Myradowa · +993 65 31 22 10')).toBeVisible()
    await expect(within(sheet).getByRole('button', { name: /Glow Studio.*current workspace/ })).toHaveAttribute('aria-current', 'true')
    await userEvent.click(within(sheet).getByRole('button', { name: /Aýnanyň saç studiýasy.*1 request/ }))
    await expect(args.onSelect).toHaveBeenCalledWith('ayna-studio')
  },
}

/** Phone row in the More sheet: the same sheet opens from it. */
export const PhoneRow: Story = { args: { variant: 'row', className: 'w-90' }, globals: { viewport: { value: 'xs' } } }

/** Russian, ~30% longer (DS-Patterns 09): names and captions are cut with an ellipsis, never pushed out. */
export const RussianLength: Story = {
  args: {
    name: 'Студия красоты «Глоу»',
    level: 'Владелец',
    items: [
      { id: 'glow-studio', name: 'Студия красоты «Глоу»', caption: 'Владелец · Ашхабад', logo: brand.icon, current: true },
      { id: 'glow-nails', name: 'Ногтевая студия «Глоу»', caption: 'Администратор · Ашхабад', count: 12, countLabel: '12 заявок' },
    ],
    copy: {
      title: 'Ваши рабочие места',
      create: 'Создать бизнес',
      trigger: 'Рабочее место: Студия красоты «Глоу», Владелец. Сменить',
      current: 'текущее рабочее место',
      note: 'При смене рабочего места меняются и календарь, и клиенты, и настройки.',
      close: 'Закрыть',
    },
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Сменить/ }))
    const menu = await within(document.body).findByRole('menu', { name: 'Ваши рабочие места' })
    await waitFor(() => expect(menu).toBeVisible())
    await userEvent.keyboard('{Escape}')
  },
}

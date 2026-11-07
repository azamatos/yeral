/**
 * NoteRow — DS-Lists → 05 Callouts (A10) «Alert note on a client card · a note row, not a box»: the alert is the
 * warning icon and nothing else, the meta one plain line, a «…» menu per note. Copy is the board's; screens pass theirs.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Ellipsis, Plus } from 'lucide-react'
import { expect, screen, userEvent, waitFor } from 'storybook/test'
import { Button, IconButton } from '../button'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../menu'
import { SectionHeader } from '../section-header'
import { NoteRow } from './note-row'

const meta = {
  title: 'Display/NoteRow',
  component: NoteRow,
  args: { alert: true, meta: 'Maýsa · 4 October · Shown when booking', children: 'Allergic to ammonia — only ammonia-free colour.' },
  argTypes: { action: { control: false } },
} satisfies Meta<typeof NoteRow>
export default meta
type Story = StoryObj<typeof meta>

const NoteMenu = () => (
  <Menu>
    <MenuTrigger asChild>
      <IconButton label="Note actions" variant="plain" size="s">
        <Ellipsis />
      </IconButton>
    </MenuTrigger>
    <MenuContent>
      <MenuItem>Edit</MenuItem>
      <MenuItem>Don’t show when booking</MenuItem>
      <MenuItem>Delete</MenuItem>
    </MenuContent>
  </Menu>
)

/** An alert note: the warning icon (18, pending ink), text ink 14/20, the meta 12/16 under it on one plain line. */
export const Alert: Story = {
  render: (args) => (
    <div className="max-w-120">
      <NoteRow {...args} />
    </div>
  ),
  play: async ({ canvas }) => {
    const text = canvas.getByText('Allergic to ammonia — only ammonia-free colour.')
    await expect(getComputedStyle(text).fontSize).toBe('14px')
    await expect(getComputedStyle(text).color).toBe('rgb(16, 16, 20)')
    const meta = canvas.getByText('Maýsa · 4 October · Shown when booking')
    await expect(getComputedStyle(meta).fontSize).toBe('12px')
    await expect(getComputedStyle(meta).color).toBe('rgb(110, 110, 120)')
    const icon = text.closest('.group')?.querySelector('svg') as SVGElement
    await expect(icon.getBoundingClientRect().height).toBe(18)
    await expect(getComputedStyle(icon).color).toBe('rgb(147, 80, 10)')
    // the text column starts 30 in: the icon 18 + the gap 12
    await expect(Math.round(text.getBoundingClientRect().left - icon.getBoundingClientRect().left)).toBe(30)
  },
}

/** A plain note keeps the icon's column empty, so every text lines up. */
export const Plain: Story = {
  args: { alert: false, meta: 'Selbi · 3 July', children: 'Can only come in the mornings, before 12:00.' },
  render: (args) => (
    <div className="max-w-120">
      <NoteRow {...args} />
    </div>
  ),
  play: async ({ canvas }) => {
    const row = canvas.getByText('Can only come in the mornings, before 12:00.').closest('.group') as HTMLElement
    await expect(row.querySelector('svg')).toBeNull()
    await expect(Math.round(canvas.getByText(/mornings/).getBoundingClientRect().left - row.getBoundingClientRect().left)).toBe(30)
  },
}

/** Each note has a «…» menu (Edit · Don’t show when booking · Delete): two or more actions, so a menu, as an IconButton S plain. */
export const WithMenu: Story = {
  render: (args) => (
    <div className="max-w-120">
      <NoteRow {...args} action={<NoteMenu />} />
    </div>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Note actions' }))
    const item = await screen.findByRole('menuitem', { name: 'Don’t show when booking' })
    await waitFor(() => expect(item).toBeVisible())
    await userEvent.keyboard('{Escape}')
  },
}

/** The card as drawn: Notes · count · Add note, then the rows with a line between them that starts at the text column. */
export const Stack: Story = {
  render: () => (
    <div className="max-w-120 rounded-card border border-n-200 px-5 py-4">
      <SectionHeader
        as="h3"
        title="Notes"
        count={2}
        action={
          <Button size="s">
            <Plus />
            Add note
          </Button>
        }
      />
      <div className="flex flex-col">
        <NoteRow alert meta="Maýsa · 4 October · Shown when booking" action={<NoteMenu />}>
          Allergic to ammonia — only ammonia-free colour.
        </NoteRow>
        <NoteRow meta="Selbi · 3 July" action={<NoteMenu />}>
          Can only come in the mornings, before 12:00.
        </NoteRow>
      </div>
    </div>
  ),
  play: async ({ canvas }) => {
    const first = canvas.getByText(/Allergic/).closest('.group') as HTMLElement
    const second = canvas.getByText(/mornings/).closest('.group') as HTMLElement
    await expect(getComputedStyle(first.children[1] as HTMLElement).borderTopWidth).toBe('0px')
    const column = second.children[1] as HTMLElement
    await expect(getComputedStyle(column).borderTopWidth).toBe('1px')
    await expect(Math.round(column.getBoundingClientRect().left - second.getBoundingClientRect().left)).toBe(30)
    await expect(canvas.getAllByRole('button', { name: 'Note actions' })).toHaveLength(2)
  },
}

/** Long text wraps in the text column, a long name in the meta too; the menu keeps its place on the right. */
export const LongText: Story = {
  name: 'Long text (Russian)',
  render: () => (
    <div className="flex max-w-90 flex-col">
      <NoteRow alert meta="Гульнара Аннамухаммедова · 4 октября · Показывать при записи" action={<NoteMenu />}>
        Аллергия на аммиак — только безаммиачное окрашивание, и предупредить мастера заранее, если меняется состав краски.
      </NoteRow>
      <NoteRow meta="Сельби · 3 июля" action={<NoteMenu />}>
        Может приходить только по утрам, до 12:00.
      </NoteRow>
    </div>
  ),
}

/** At 390 the same rows fill the width. */
export const Phone390: Story = {
  name: 'On a phone (390)',
  globals: { viewport: { value: 'xs' } },
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div className="flex flex-col px-4">
      <NoteRow alert meta="Maýsa · 4 October · Shown when booking" action={<NoteMenu />}>
        Allergic to ammonia — only ammonia-free colour.
      </NoteRow>
      <NoteRow meta="Selbi · 3 July" action={<NoteMenu />}>
        Can only come in the mornings, before 12:00.
      </NoteRow>
    </div>
  ),
}

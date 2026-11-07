/** Breadcrumbs and pagination — DS-Components → Navigation. */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { expect, userEvent } from 'storybook/test'
import { Pagination, pageItems } from '../pagination'
import { Breadcrumbs, Crumb } from './breadcrumbs'

const meta = {
  title: 'Navigation/Breadcrumbs and pagination',
  component: Breadcrumbs,
  args: { label: 'Ýol', children: null },
} satisfies Meta<typeof Breadcrumbs>
export default meta
type Story = StoryObj<typeof meta>

/** DS · Lists A7: the parents look like links, chevrons between, the current page in ink 600. */
export const Crumbs: Story = {
  render: () => (
    <Breadcrumbs label="You are here">
      <Crumb href="#home">Home</Crumb>
      <Crumb href="#beauty">Beauty</Crumb>
      <Crumb current>Glow Studio</Crumb>
    </Breadcrumbs>
  ),
  play: async ({ canvas }) => {
    const nav = canvas.getByRole('navigation', { name: 'You are here' })
    await expect(canvas.getByRole('link', { name: 'Beauty' })).toHaveAttribute('href', '#beauty')
    await expect(canvas.getByText('Glow Studio')).toHaveAttribute('aria-current', 'page')
    await expect(getComputedStyle(canvas.getByText('Glow Studio')).fontWeight).toBe('600')
    await expect(nav.querySelectorAll('svg')).toHaveLength(2)
  },
}

/** A long current page is cut with «…» on one line (the full name on hover). */
export const LongName: Story = {
  render: () => (
    <div style={{ width: 320 }}>
      <Breadcrumbs label="You are here">
        <Crumb href="#home">Home</Crumb>
        <Crumb href="#beauty">Beauty</Crumb>
        <Crumb current>Gözellik merkezi «Aýperi» — saç, dyrnak we ýüz ideg</Crumb>
      </Breadcrumbs>
    </div>
  ),
  play: async ({ canvas }) => {
    const current = canvas.getByText(/^Gözellik merkezi/)
    await expect(current).toHaveAttribute('title', 'Gözellik merkezi «Aýperi» — saç, dyrnak we ýüz ideg')
    await expect(current.scrollWidth).toBeGreaterThan(current.clientWidth)
  },
}

function Pages() {
  const [page, setPage] = useState(1)
  return (
    <Pagination
      page={page}
      pageCount={13}
      onPageChange={setPage}
      label="Sahypalar"
      prevLabel="Öňki sahypa"
      nextLabel="Indiki sahypa"
      pageLabel={(n) => `Sahypa ${n}`}
    />
  )
}

export const Pages13: Story = {
  name: 'Pagination',
  render: () => <Pages />,
  play: async ({ canvas }) => {
    await expect(pageItems(7, 13)).toEqual([1, '…', 6, 7, 8, '…', 13])
    await userEvent.click(canvas.getByRole('button', { name: 'Indiki sahypa' }))
    await expect(canvas.getByRole('button', { name: 'Sahypa 2' })).toHaveAttribute('aria-current', 'page')
  },
}

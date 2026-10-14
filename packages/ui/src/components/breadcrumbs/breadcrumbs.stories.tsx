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

export const Crumbs: Story = {
  render: () => (
    <Breadcrumbs label="Ýol">
      <Crumb href="#home">Baş sahypa</Crumb>
      <Crumb href="#barbers">Dellekhanalar</Crumb>
      <Crumb current>Barber Loft</Crumb>
    </Breadcrumbs>
  ),
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

/** Popover — anchored panel for pickers and short content; closes on outside click and Esc. */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, screen, userEvent, waitFor } from 'storybook/test'
import { Button } from '../button'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

function Demo() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button>Iş wagty</Button>
      </PopoverTrigger>
      <PopoverContent aria-label="Iş wagty">
        <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-body">
          <dt>Duşenbe – Anna</dt>
          <dd className="m-0 tabular-nums">09:00–20:00</dd>
          <dt className="font-semibold">Şenbe</dt>
          <dd className="m-0 font-semibold tabular-nums">10:00–18:00</dd>
          <dt>Ýekşenbe</dt>
          <dd className="m-0 text-n-600">Ýapyk</dd>
        </dl>
      </PopoverContent>
    </Popover>
  )
}

const meta = { title: 'Overlays/Popover', component: Demo } satisfies Meta<typeof Demo>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Iş wagty' }))
    const dialog = await screen.findByRole('dialog', { name: 'Iş wagty' })
    await waitFor(() => expect(dialog).toBeVisible())
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  },
}

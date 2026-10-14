/** Toast — ink, bottom-left, one at a time, one action; undo instead of a second confirmation. */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, screen, userEvent, waitFor } from 'storybook/test'
import { Button } from '../button'
import { Toaster, toast } from './toast'

const undo = fn()

function Demo() {
  return (
    <>
      <Button onClick={() => toast('Ýazylyş ýatyryldy', { action: { label: 'Yzyna al', onClick: undo } })}>Ýatyr</Button>{' '}
      <Button onClick={() => toast('Ýazylyş ugradyldy — tassyklanyşyna garaşyň')}>Ugrat</Button>
      <Toaster />
    </>
  )
}

const meta = { title: 'Overlays/Toast', component: Demo } satisfies Meta<typeof Demo>
export default meta
type Story = StoryObj<typeof meta>

export const Undo: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Ýatyr' }))
    const message = await screen.findByText('Ýazylyş ýatyryldy')
    await waitFor(() => expect(message).toBeVisible())
    await userEvent.click(screen.getByRole('button', { name: 'Yzyna al' }))
    await expect(undo).toHaveBeenCalled()
  },
}

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
    // DS-Patterns `.toast`: the action ends 8 from the toast's right edge
    const box = message.closest('[data-sonner-toast]')
    const action = screen.getByRole('button', { name: 'Yzyna al' })
    await expect(box && Math.round(box.getBoundingClientRect().right - action.getBoundingClientRect().right)).toBe(8)
    await userEvent.click(action)
    await expect(undo).toHaveBeenCalled()
  },
}

/** Inside the business shell: the layout says where toasts start (here 272 from the left, as beside the sidebar). */
export const ShellOffset: Story = {
  decorators: [
    (Story) => (
      <>
        <style>{':root { --toast-left: 272px; --toast-bottom: 24px }'}</style>
        {Story()}
      </>
    ),
  ],
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Ugrat' }))
    const message = await screen.findByText('Ýazylyş ugradyldy — tassyklanyşyna garaşyň')
    await waitFor(() => expect(message).toBeVisible())
    const list = message.closest('[data-sonner-toaster]')
    await expect(list && getComputedStyle(list).getPropertyValue('--offset-left').trim()).toBe('272px')
    // words alone («Saved»): DS-Patterns `.toast.plain`, 16 left and 20 right
    const box = message.closest('[data-sonner-toast]')
    await expect(box && getComputedStyle(box).paddingLeft).toBe('16px')
    await expect(box && getComputedStyle(box).paddingRight).toBe('20px')
  },
}

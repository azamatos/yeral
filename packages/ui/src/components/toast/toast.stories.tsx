/**
 * Toast — DS-Lists → 05 Callouts (A10) «Toasts · ink, 14/20, radius 12, min 48, max 440»: a tinted icon, one text
 * action, an × only where the toast must be closed by hand; bottom-left of the content, bottom centre on a phone.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { WifiOff } from 'lucide-react'
import { expect, fn, screen, userEvent, waitFor } from 'storybook/test'
import { Button } from '../button'
import { Toaster, toast } from './toast'

const undo = fn()
const retry = fn()
const pick = fn()

function Demo() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={() => toast('Booking saved')}>
        Show success
      </Button>
      <Button variant="secondary" onClick={() => toast.info('Code sent to your Telegram')}>
        Show info
      </Button>
      <Button variant="secondary" onClick={() => toast.warning('You’re offline. We’ll save when you’re back.', { icon: <WifiOff /> })}>
        Show warning
      </Button>
      <Button
        variant="secondary"
        onClick={() => toast.error('Couldn’t save the booking.', { action: { label: 'Try again', onClick: retry } })}
      >
        Show error
      </Button>
      <Button variant="secondary" onClick={() => toast('Tag removed', { action: { label: 'Undo', onClick: undo } })}>
        Show undo
      </Button>
      <Button variant="secondary" onClick={() => toast('Reminder sent to Jahan Muradowa', { closeButton: true })}>
        Show with close
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast.error('Couldn’t move the booking — Jeren is busy at 14:30. Pick another time.', {
            action: { label: 'Pick a time', onClick: pick },
          })
        }
      >
        Show long
      </Button>
      <Toaster label="Notifications" closeLabel="Close" />
    </div>
  )
}

const meta = {
  title: 'Overlays/Toast',
  component: Demo,
  // sonner keeps its toasts in a module: the ones a story left are closed before the next one mounts its Toaster
  beforeEach: () => {
    toast.dismiss()
  },
} satisfies Meta<typeof Demo>
export default meta
type Story = StoryObj<typeof meta>

const boxOf = (message: HTMLElement) => message.closest('[data-sonner-toast]') as HTMLElement
const iconOf = (box: HTMLElement) => box.querySelector('[data-icon] svg') as SVGElement

/** A done thing: ink, the check in a-200, pad 12 16, min 48 high. `toast('Booking saved')`. */
export const Success: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Show success' }))
    const message = await screen.findByText('Booking saved')
    await waitFor(() => expect(message).toBeVisible())
    const box = boxOf(message)
    await expect(getComputedStyle(box).padding).toBe('12px 16px')
    await expect(getComputedStyle(box).borderRadius).toBe('12px')
    await expect(box.getBoundingClientRect().height).toBe(48)
    await expect(getComputedStyle(iconOf(box)).color).toBe('rgb(195, 182, 251)')
    await expect(iconOf(box).getBoundingClientRect().height).toBe(20)
    await expect(screen.queryByRole('alert')).toBeNull()
  },
}

/** Something to know, not a result: the info icon in a-200. `toast.info(…)`. */
export const Info: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Show info' }))
    const message = await screen.findByText('Code sent to your Telegram')
    await waitFor(() => expect(message).toBeVisible())
    await expect(getComputedStyle(iconOf(boxOf(message))).color).toBe('rgb(195, 182, 251)')
  },
}

/** The icon in the pending line's amber; a screen may pass its own icon (offline → wifi-off). */
export const Warning: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Show warning' }))
    const message = await screen.findByText('You’re offline. We’ll save when you’re back.')
    await waitFor(() => expect(message).toBeVisible())
    await expect(getComputedStyle(iconOf(boxOf(message))).color).toBe('rgb(242, 221, 176)')
  },
}

/**
 * An error is `role="alert"`, its icon in the danger line's red. With an action it stays until closed or acted on: the
 * duration is off and the × appears.
 */
export const ErrorWithAction: Story = {
  name: 'Error with an action',
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Show error' }))
    const message = await screen.findByText('Couldn’t save the booking.')
    await waitFor(() => expect(message).toBeVisible())
    await expect(screen.getByRole('alert')).toHaveTextContent('Couldn’t save the booking.')
    const box = boxOf(message)
    await expect(getComputedStyle(iconOf(box)).color).toBe('rgb(246, 199, 194)')
    // DS-Lists `.toast.a`: pad 8 8 8 16, the action 32 high, the × 32 square ending 8 from the edge
    await expect(getComputedStyle(box).padding).toBe('8px 8px 8px 16px')
    const close = screen.getByRole('button', { name: 'Close' })
    await expect(close.getBoundingClientRect().height).toBe(32)
    await expect(Math.round(box.getBoundingClientRect().right - close.getBoundingClientRect().right)).toBe(8)
    const action = screen.getByRole('button', { name: 'Try again' })
    await expect(action.getBoundingClientRect().height).toBe(32)
    await userEvent.click(action)
    await expect(retry).toHaveBeenCalled()
  },
}

/** Undo instead of a second confirmation: the text action in a-200 600 ends 8 from the edge. */
export const Undo: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Show undo' }))
    const message = await screen.findByText('Tag removed')
    await waitFor(() => expect(message).toBeVisible())
    const box = boxOf(message)
    const action = screen.getByRole('button', { name: 'Undo' })
    await expect(Math.round(box.getBoundingClientRect().right - action.getBoundingClientRect().right)).toBe(8)
    await expect(getComputedStyle(action).color).toBe('rgb(195, 182, 251)')
    await expect(getComputedStyle(action).fontWeight).toBe('600')
    await userEvent.click(action)
    await expect(undo).toHaveBeenCalled()
  },
}

/** With close: the × in n-300, 32 square, named by the Toaster's `closeLabel`. */
export const Dismissible: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Show with close' }))
    const message = await screen.findByText('Reminder sent to Jahan Muradowa')
    await waitFor(() => expect(message).toBeVisible())
    const close = screen.getByRole('button', { name: 'Close' })
    await expect(getComputedStyle(close).color).toBe('rgb(216, 216, 222)')
    await expect(close.getBoundingClientRect().width).toBe(32)
    await userEvent.click(close)
    await waitFor(() => expect(screen.queryByText('Reminder sent to Jahan Muradowa')).toBeNull())
  },
}

/** Long: the text wraps up to the 440 max width; the icon and the action stay on top. */
export const LongText: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Show long' }))
    const message = await screen.findByText(/Couldn’t move the booking/)
    await waitFor(() => expect(message).toBeVisible())
    const box = boxOf(message)
    await expect(box.getBoundingClientRect().width).toBeLessThanOrEqual(440)
    await expect(message.getBoundingClientRect().height).toBeGreaterThan(20)
    const action = screen.getByRole('button', { name: 'Pick a time' })
    await expect(Math.round(action.getBoundingClientRect().top - box.getBoundingClientRect().top)).toBe(8)
    await expect(iconOf(box).getBoundingClientRect().top).toBeLessThan(message.getBoundingClientRect().top + 20)
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
    await userEvent.click(canvas.getByRole('button', { name: 'Show success' }))
    const message = await screen.findByText('Booking saved')
    await waitFor(() => expect(message).toBeVisible())
    const list = message.closest('[data-sonner-toaster]')
    await expect(list && getComputedStyle(list).getPropertyValue('--offset-left').trim()).toBe('272px')
  },
}

/** On a phone: full width minus the 16 gutters, bottom centre (a shell with a tab bar lifts it 12 above the bar). */
export const Phone390: Story = {
  name: 'On a phone (390)',
  globals: { viewport: { value: 'xs' } },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Show undo' }))
    const message = await screen.findByText('Tag removed')
    await waitFor(() => expect(message).toBeVisible())
    const box = boxOf(message).getBoundingClientRect()
    await expect(Math.round(box.left)).toBe(16)
    await expect(Math.round(window.innerWidth - box.right)).toBe(16)
  },
}

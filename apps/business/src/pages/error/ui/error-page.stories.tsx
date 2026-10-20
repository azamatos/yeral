/** A screen that failed to load or render (every route's `errorComponent`; not drawn: the empty-state pattern). */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent, waitFor } from 'storybook/test'
import { PageStory } from '@/shared/storybook'
import { ErrorPage } from './error-page'

const onRetry = fn()

function Failed() {
  return <ErrorPage onRetry={onRetry} />
}

const meta = {
  title: 'Business/Pages/Error',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  args: { routes: { '/': Failed } },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Something went wrong' })).toBeVisible()
    await waitFor(() => expect(document.title).toBe('Something went wrong · Ýeral Business'))
    await userEvent.click(canvas.getByRole('button', { name: 'Try again' }))
    await expect(onRetry).toHaveBeenCalledOnce()
  },
}

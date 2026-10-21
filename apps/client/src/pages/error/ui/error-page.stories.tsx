/** A page that failed (every route's `errorComponent`; not drawn: States tile 07's inline block). */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { PageStory } from '@/shared/storybook'
import { ErrorPage } from './error-page'

const onRetry = fn()

function Failed() {
  return <ErrorPage onRetry={onRetry} />
}

const meta = {
  title: 'Client/Pages/Error',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  args: { routes: { '/$lang': Failed } },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Something went wrong' })).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Try again' }))
    await expect(onRetry).toHaveBeenCalledOnce()
  },
}

export const Phone: Story = { globals: { viewport: { value: 'xs' } } }

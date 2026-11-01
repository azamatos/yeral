/** About, Help, Privacy and Terms (design «Static pages», book F-034, Q-033): a 720 column of words under the site's chrome. */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, waitFor } from 'storybook/test'
import { authApi, PageStory } from '@/shared/storybook'
import { StaticPage } from './static-page'

const meta = {
  title: 'Client/Pages/Static',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  args: {
    routes: {
      '/$lang/about': () => <StaticPage page="about" />,
      '/$lang/help': () => <StaticPage page="help" />,
      '/$lang/privacy': () => <StaticPage page="privacy" />,
      '/$lang/terms': () => <StaticPage page="terms" />,
    },
    path: '/en/about',
    server: authApi(),
  },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

export const About: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'About Ýeral' })).toBeVisible()
    await expect(canvas.getByText(/built and run by Azamat Jorayev, Turkmenistan/)).toBeVisible()
  },
}

export const Help: Story = {
  args: { path: '/en/help' },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Help' })).toBeVisible()
    await expect(canvas.getByRole('heading', { level: 2, name: 'Changing or cancelling' })).toBeVisible()
  },
}

/** The policy says what the first launch is, and no placeholder is left in the words. */
export const Privacy: Story = {
  args: { path: '/en/privacy' },
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Privacy policy' })).toBeVisible()
    await expect(canvas.getByRole('heading', { level: 2, name: 'This site is a demo' })).toBeVisible()
    await expect(canvas.getByText('On a server in the European Union.')).toBeVisible()
    await waitFor(() => expect(canvasElement.textContent).not.toMatch(/\{(brand|operator|country)\}/))
  },
}

export const Terms: Story = {
  args: { path: '/en/terms' },
  play: async ({ canvas, canvasElement }) => {
    await expect(await canvas.findByRole('heading', { level: 1, name: 'Terms' })).toBeVisible()
    await expect(canvas.getByText('These terms are under the law of Turkmenistan.')).toBeVisible()
    await waitFor(() => expect(canvasElement.textContent).not.toMatch(/\{(brand|operator|country)\}/))
  },
}

export const Phone: Story = { args: { path: '/en/privacy' }, globals: { viewport: { value: 'xs' } } }

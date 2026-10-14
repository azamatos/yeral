/** Switch — Profile notification settings: «Onlaýn ýazylyş açyk». */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { Switch } from './switch'

const meta = { title: 'Selection/Switch', component: Switch, args: { 'aria-label': 'Ýatlatma 1 gün öň' } } satisfies Meta<typeof Switch>
export default meta
type Story = StoryObj<typeof meta>

export const Off: Story = {
  play: async ({ canvas }) => {
    const sw = canvas.getByRole('switch')
    await userEvent.click(sw)
    await expect(sw).toHaveAttribute('aria-checked', 'true')
  },
}
export const On: Story = { args: { defaultChecked: true } }
export const Disabled: Story = { args: { disabled: true } }

export const InASettingsRow: Story = {
  render: () => (
    <div className="flex max-w-120 items-center justify-between border-b border-n-200 py-3">
      <span id="l1" className="text-body">
        SMS: tassyklama
      </span>
      <Switch aria-labelledby="l1" defaultChecked />
    </div>
  ),
}

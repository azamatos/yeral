/**
 * SettingsRow — DS-Patterns → SettingsLayout + SettingsGroup + SettingsRow (B-Settings, B-Onboarding step 7): the
 * label and its help on the left, the control on the right, wrapping when narrow. Stories are the component's tests.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { Input } from '../input'
import { OptionCard, OptionCardGroup } from '../option-card'
import { Select } from '../select'
import { Switch } from '../switch'
import { SettingsRow } from './settings-row'

const meta = {
  title: 'Inputs/SettingsRow',
  component: SettingsRow,
  args: { label: 'Online booking', children: null },
  decorators: [(Story) => <div className="flex max-w-184 flex-col">{Story()}</div>],
} satisfies Meta<typeof SettingsRow>
export default meta
type Story = StoryObj<typeof meta>

/** A switch: the label names it through `labelId`. */
export const WithSwitch: Story = {
  render: () => (
    <SettingsRow
      labelId="sr-ask"
      label="Ask clients for a reason when they cancel"
      description="Optional for the client"
      descriptionId="sr-ask-help"
    >
      <Switch aria-labelledby="sr-ask" aria-describedby="sr-ask-help" defaultChecked className="self-end" />
    </SettingsRow>
  ),
  play: async ({ canvas }) => {
    const toggle = canvas.getByRole('switch', { name: 'Ask clients for a reason when they cancel' })
    await expect(toggle).toHaveAccessibleDescription('Optional for the client')
    await userEvent.click(toggle)
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
  },
}

/** A select (44, as in settings); the wizard's rows add the dividers. */
export const WithSelect: Story = {
  render: () => (
    <>
      <SettingsRow
        htmlFor="sr-hold"
        label="Hold requests for"
        description="The time counts only while you’re open. The hold never runs past the visit’s start."
        className="border-t border-n-200 py-5"
      >
        <Select id="sr-hold" size="m" defaultValue="30">
          <option value="15">15 min</option>
          <option value="30">30 min</option>
          <option value="60">60 min</option>
        </Select>
      </SettingsRow>
      <SettingsRow
        htmlFor="sr-cancel"
        label="Clients can cancel for free"
        description="Later than this, a client can only cancel by calling you."
        className="border-y border-n-200 py-5"
      >
        <Select id="sr-cancel" size="m" defaultValue="120">
          <option value="0">Any time</option>
          <option value="120">Up to 2 h before</option>
        </Select>
      </SettingsRow>
    </>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('combobox', { name: 'Hold requests for' })).toHaveValue('30')
    await expect(canvas.getByRole('combobox', { name: 'Clients can cancel for free' })).toHaveValue('120')
  },
}

/** An input whose error sits under it, in the control column. */
export const InputWithError: Story = {
  render: () => (
    <SettingsRow htmlFor="sr-buffer" label="Custom buffer" description="1–120 minutes after each service">
      <Input id="sr-buffer" defaultValue="150" aria-invalid aria-describedby="sr-buffer-error" />
      <span id="sr-buffer-error" role="alert" className="text-dense font-semibold text-danger-ink">
        Up to 120 minutes.
      </span>
    </SettingsRow>
  ),
}

/** Radio cards under the label: the group is named by `labelId`. */
export const RadioCards: Story = {
  render: () => (
    <SettingsRow labelId="sr-who" label="Who answers requests?" description="You can always answer.">
      <OptionCardGroup aria-labelledby="sr-who" defaultValue="both" className="gap-2">
        <OptionCard value="desk" indicator="start" title="Owner and admins" />
        <OptionCard value="both" indicator="start" title="Both" />
      </OptionCardGroup>
    </SettingsRow>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('radiogroup', { name: 'Who answers requests?' })).toBeInTheDocument()
  },
}

/** Narrow (a phone): the control wraps under the label. */
export const Narrow: Story = {
  ...WithSelect,
  decorators: [(Story) => <div className="flex w-80 flex-col">{Story()}</div>],
}

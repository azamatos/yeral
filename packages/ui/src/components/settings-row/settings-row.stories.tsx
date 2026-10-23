/**
 * SettingsRow — DS-Patterns → SettingsLayout + SettingsGroup + SettingsRow (B-Settings, B-Onboarding step 7): the
 * label and its help on the left, the control on the right, wrapping when narrow. Stories are the component's tests.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { FieldMessage } from '../field'
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

/** A switch at the row's right edge, named and described by the row. */
export const WithSwitch: Story = {
  render: () => (
    <SettingsRow label="Ask clients for a reason when they cancel" description="Optional for the client">
      {({ id, descriptionId }) => <Switch id={id} aria-describedby={descriptionId} defaultChecked />}
    </SettingsRow>
  ),
  play: async ({ canvas }) => {
    const toggle = canvas.getByRole('switch', { name: 'Ask clients for a reason when they cancel' })
    await expect(toggle).toHaveAccessibleDescription('Optional for the client')
    await userEvent.click(toggle)
    await expect(toggle).toHaveAttribute('aria-checked', 'false')
  },
}

/** Selects at their own width (the wizard's 220); the select takes the row's label and help by itself. */
export const WithSelect: Story = {
  render: () => (
    <>
      <SettingsRow
        label="Hold requests for"
        description="The time counts only while you’re open. The hold never runs past the visit’s start."
        className="border-t border-n-200 py-5"
      >
        <Select defaultValue="30" className="w-55">
          <option value="15">15 min</option>
          <option value="30">30 min</option>
          <option value="60">60 min</option>
        </Select>
      </SettingsRow>
      <SettingsRow
        label="Clients can cancel for free"
        description="Later than this, a client can only cancel by calling you."
        className="border-y border-n-200 py-5"
      >
        <Select defaultValue="120" className="w-55">
          <option value="0">Any time</option>
          <option value="120">Up to 2 h before</option>
        </Select>
      </SettingsRow>
    </>
  ),
  play: async ({ canvas }) => {
    const hold = canvas.getByRole('combobox', { name: 'Hold requests for' })
    await expect(hold).toHaveValue('30')
    await expect(hold).toHaveAccessibleDescription(/The hold never runs past the visit’s start/)
    await expect(canvas.getByRole('combobox', { name: 'Clients can cancel for free' })).toHaveValue('120')
  },
}

/** An input with its error under it, in the 320 column. */
export const InputWithError: Story = {
  render: () => (
    <SettingsRow label="Custom buffer" description="1–120 minutes after each service" invalid wide>
      <Input defaultValue="150" />
      <FieldMessage>Up to 120 minutes.</FieldMessage>
    </SettingsRow>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('textbox', { name: 'Custom buffer' })).toHaveAttribute('aria-invalid', 'true')
  },
}

/** Radio cards under the label at full width; the group is named by the row's label. */
export const RadioCards: Story = {
  render: () => (
    <SettingsRow layout="stacked" label="Who answers requests?" description="You can always answer.">
      {({ labelId, descriptionId }) => (
        <OptionCardGroup aria-labelledby={labelId} aria-describedby={descriptionId} defaultValue="both" className="gap-2">
          <OptionCard value="desk" indicator="start" title="Owner and admins" />
          <OptionCard value="both" indicator="start" title="Both" />
        </OptionCardGroup>
      )}
    </SettingsRow>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('radiogroup', { name: 'Who answers requests?' })).toHaveAccessibleDescription('You can always answer.')
  },
}

/** Narrow (a phone): the control wraps under the label. */
export const Narrow: Story = {
  ...WithSelect,
  decorators: [(Story) => <div className="flex w-80 flex-col">{Story()}</div>],
}

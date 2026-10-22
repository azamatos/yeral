/**
 * WizardFooter — DS-Patterns → «Wizard footer · desktop sticky bottom»; B-Onboarding `.foot .fin .fh` (the setup
 * wizard). Stories are the component's tests.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { Button } from '../button'
import { WizardFooter } from './wizard-footer'

const meta = {
  title: 'Navigation/WizardFooter',
  component: WizardFooter,
  args: {
    back: { label: 'Back', onClick: fn() },
    primary: { children: 'Continue', onClick: fn() },
  },
  decorators: [
    (Story) => (
      <div className="overflow-hidden rounded-card border border-n-200">
        <div className="h-30 bg-n-50" />
        {Story()}
      </div>
    ),
  ],
} satisfies Meta<typeof WizardFooter>
export default meta
type Story = StoryObj<typeof meta>

/** A step that's filled in: Back and Continue. */
export const Ready: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Back' }))
    await expect(args.back?.onClick).toHaveBeenCalled()
    await userEvent.click(canvas.getByRole('button', { name: 'Continue' }))
    await expect(args.primary?.onClick).toHaveBeenCalled()
  },
}

/** The step isn't valid yet: Continue is disabled and the hint says why (hidden on phones). */
export const DisabledWithHint: Story = {
  args: { hint: 'Pick a category.', primary: { children: 'Continue', disabled: true } },
  play: async ({ canvas }) => {
    const cont = canvas.getByRole('button', { name: 'Continue' })
    await expect(cont).toBeDisabled()
    await expect(cont).toHaveAccessibleDescription('Pick a category.')
  },
}

/** The first step: no Back. */
export const FirstStep: Story = { args: { back: undefined } }

/** A signed-in owner creating another business: Cancel instead of Back on its first step. */
export const WithCancel: Story = {
  args: {
    back: undefined,
    start: (
      <Button variant="ghost" size="l">
        Cancel
      </Button>
    ),
  },
}

/** Saving the step: the primary keeps its width and shows a spinner. */
export const Saving: Story = { args: { primary: { children: 'Continue', loading: true, loadingLabel: 'Saving' } } }

/** The last step: a secondary action before the primary. */
export const LastStep: Story = {
  args: { back: undefined, primary: { children: 'Go to the calendar' } },
  render: (args) => (
    <WizardFooter {...args}>
      <Button variant="secondary" size="l">
        Send invites
      </Button>
    </WizardFooter>
  ),
}

/** Russian is about 30% longer: the hint wraps, the buttons keep their labels on one line. */
export const RussianLength: Story = {
  args: {
    back: { label: 'Назад', onClick: fn() },
    hint: 'Выберите категорию бизнеса из списка.',
    primary: { children: 'Продолжить', disabled: true },
  },
}

/** Phones: the hint hides and the primary takes the free width. */
export const Phone: Story = { args: { hint: 'Pick a category.' }, globals: { viewport: { value: 'xs' } } }

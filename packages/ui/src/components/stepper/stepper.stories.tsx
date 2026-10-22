/** Stepper — the booking flow's header steps (Booking `.stps`) and the setup wizard's vertical list (B-Onboarding, DS-Patterns → Stepper). */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { Stepper } from './stepper'

const meta = {
  title: 'Navigation/Stepper',
  component: Stepper,
  args: { steps: ['Hyzmatlar', 'Hünärmen', 'Wagt', 'Tassyklama'], current: 2, onStepClick: fn(), 'aria-label': 'Ýazylyş ädimleri' },
  decorators: [
    (Story, { args }) =>
      args.orientation === 'vertical' ? Story() : <div className="flex h-18 items-stretch border-b border-n-200 px-6">{Story()}</div>,
  ],
} satisfies Meta<typeof Stepper>
export default meta
type Story = StoryObj<typeof meta>

export const TimeStep: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: /Hünärmen/ }))
    await expect(args.onStepClick).toHaveBeenCalledWith(1)
    await expect(canvas.getByRole('button', { name: /Tassyklama/ })).toBeDisabled()
  },
}
export const First: Story = { args: { current: 0 } }
export const Phone: Story = { globals: { viewport: { value: 'xs' } } }

const setupSteps = ['Phone', 'Business', 'Address', 'Hours', 'Services', 'Team', 'Booking rules', 'Done']
const setupSummaries = ['+993 65 12 34 56', 'Glow Studio · Beauty', 'Magtymguly Avenue 51, Ashgabat', 'Mon–Sat 09:00–20:00']

/** The setup wizard's step list (B-Onboarding aside): done steps with summaries, the current one, the rest locked. */
export const Vertical: Story = {
  args: {
    orientation: 'vertical',
    steps: setupSteps,
    summaries: setupSummaries,
    current: 3,
    doneLabel: 'Done',
    'aria-label': 'Steps',
  },
  decorators: [(Story) => <div className="w-90 bg-n-50 px-5 py-7">{Story()}</div>],
  play: async ({ args, canvas }) => {
    await expect(canvas.getByRole('button', { name: /Hours/ })).toHaveAttribute('aria-current', 'step')
    await expect(canvas.getByText('Glow Studio · Beauty')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: /Business/ }))
    await expect(args.onStepClick).toHaveBeenCalledWith(1)
    await expect(canvas.getByRole('button', { name: /Services/ })).toBeDisabled()
  },
}

/** Gone back to step 2 after reaching step 4: step 4 shows as reached (white marker) and opens when step 2 is valid. */
export const VerticalWentBack: Story = {
  args: { ...Vertical.args, current: 1, reached: 3, canOpen: (i: number) => i !== 0 && i <= 3 },
  decorators: Vertical.decorators,
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('button', { name: /Phone/ })).toBeDisabled()
    await expect(canvas.getByRole('button', { name: /Hours/ })).toBeEnabled()
  },
}

/** The first step of a new setup: nothing done yet. */
export const VerticalFirst: Story = { args: { ...Vertical.args, current: 0 }, decorators: Vertical.decorators }

/** Russian is about 30% longer: names and summaries wrap (summaries clamp at two lines). */
export const VerticalRussianLength: Story = {
  args: {
    ...Vertical.args,
    steps: ['Телефон', 'Бизнес', 'Адрес', 'Часы работы', 'Услуги', 'Команда', 'Правила записи', 'Готово'],
    summaries: ['+993 65 12 34 56', 'Glow Studio · Красота', 'проспект Махтумкули 51, Ашхабад, вход со двора', 'Пн–Сб 09:00–20:00'],
    doneLabel: 'Готово',
  },
  decorators: Vertical.decorators,
}

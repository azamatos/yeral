/**
 * Text link — B-Login `.lnk` and Auth «Belgini üýtget»: the classes for an inline link, or a button that reads as one
 * («Change number», «Start free»). Stories are its tests: a link, a button, disabled, inside a sentence, long text.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, fn, userEvent } from 'storybook/test'
import { cn } from '../../lib/cn'
import { textLink } from './text-link'

const onClick = fn()

function Sample({ text, disabled }: { text: string; disabled?: boolean }) {
  return (
    <div className="flex flex-col items-start gap-4 text-small">
      <a href="#start" className={textLink}>
        {text}
      </a>
      <button type="button" disabled={disabled} onClick={onClick} className={cn(textLink, 'hit inline-flex min-h-8 items-center')}>
        {text}
      </button>
      <p className="m-0 max-w-90 text-body text-n-600">
        To log in with <b className="font-semibold text-n-900">+993 65 10 20 30</b>.{' '}
        <button type="button" className={cn(textLink, 'whitespace-nowrap')}>
          {text}
        </button>
      </p>
    </div>
  )
}

const meta = { title: 'Actions/TextLink', component: Sample, args: { text: 'Change number' } } satisfies Meta<typeof Sample>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  play: async ({ canvas }) => {
    const [button] = canvas.getAllByRole('button', { name: 'Change number' })
    if (button) await userEvent.click(button)
    await expect(onClick).toHaveBeenCalledOnce()
  },
}

/** Disabled: n-500, no underline, no pointer. */
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('button', { name: 'Change number' })[0]).toBeDisabled()
  },
}

/** Phone width. */
export const Phone: Story = { globals: { viewport: { value: 'xs' } } }

/** Russian runs ~30% longer: the link wraps with the sentence unless told not to. */
export const RussianLength: Story = { name: 'Russian (+30% length)', args: { text: 'Изменить номер телефона' } }

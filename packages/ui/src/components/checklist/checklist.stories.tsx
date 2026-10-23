/**
 * Checklist — DS-Patterns → Feedback «Checklist» (B-Onboarding's last step: «Make your page stronger»). Stories are
 * the component's tests: one per state of the list.
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { FileText, Image, ImagePlus } from 'lucide-react'
import { expect } from 'storybook/test'
import { textLink } from '../text-link'
import { Checklist, type ChecklistItem } from './checklist'

const add = (label: string) => (
  <a href="#settings" aria-label={label} className={`${textLink} shrink-0 text-small`}>
    Add
  </a>
)

const setup = (logo: ChecklistItem['status'], photos: ChecklistItem['status'], about: ChecklistItem['status']): ChecklistItem[] => [
  {
    id: 'logo',
    status: logo,
    icon: <ImagePlus />,
    title: 'Add a logo',
    caption: 'Shown next to your name in search and on your page',
    action: add('Add a logo'),
    doneText: 'Added',
  },
  {
    id: 'photos',
    status: photos,
    icon: <Image />,
    title: 'Add 3+ photos',
    caption: 'The first photo is your card photo in search',
    action: add('Add photos'),
    doneText: 'Added',
  },
  {
    id: 'about',
    status: about,
    icon: <FileText />,
    title: 'Write an “About”',
    caption: 'Tell clients what to expect: services, products, experience',
    action: add('Add an About'),
    doneText: 'Added',
  },
]

const meta = {
  title: 'Display/Checklist',
  component: Checklist,
  args: {
    title: 'Make your page stronger',
    countLabel: (done, total) => `${done} / ${total} done`,
    doneLabel: 'Done',
    items: setup('done', 'current', 'todo'),
  },
  decorators: [(Story) => <div className="max-w-184">{Story()}</div>],
} satisfies Meta<typeof Checklist>
export default meta
type Story = StoryObj<typeof meta>

/** The board's sample in its card: the logo done, the photos next, the About to do. */
export const Setup: Story = {
  render: (args) => (
    <div className="rounded-card border border-n-200 p-6">
      <Checklist {...args} />
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { name: 'Make your page stronger' })).toBeInTheDocument()
    await expect(canvas.getByText('1 / 3 done')).toBeInTheDocument()
    const items = canvas.getAllByRole('listitem')
    await expect(items).toHaveLength(3)
    // the done one says so and drops its action; the others keep theirs
    await expect(canvas.getByRole('img', { name: 'Done' })).toBeInTheDocument()
    await expect(canvas.queryByRole('link', { name: 'Add a logo' })).toBeNull()
    await expect(canvas.getByText('Added')).toBeInTheDocument()
    await expect(canvas.getByRole('link', { name: 'Add photos' })).toBeInTheDocument()
  },
}

/** Nothing done yet, as the wizard's last step opens for a new business: the meter is empty. */
export const NoneDone: Story = {
  args: { items: setup('todo', 'todo', 'todo') },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole('img', { name: 'Done' })).toBeNull()
    await expect(canvas.getAllByRole('link', { name: /^Add/ })).toHaveLength(3)
    await expect(canvas.getByText('0 / 3 done')).toBeInTheDocument()
    await expect(canvas.getByRole('progressbar', { name: 'Make your page stronger' })).toHaveAttribute('aria-valuenow', '0')
  },
}

/** Every item done: three «Done» markers, no actions, the meter full. */
export const AllDone: Story = {
  args: { items: setup('done', 'done', 'done') },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('img', { name: 'Done' })).toHaveLength(3)
    await expect(canvas.queryAllByRole('link')).toHaveLength(0)
    await expect(canvas.getByRole('progressbar')).toHaveAttribute('aria-valuetext', '3 / 3 done')
  },
}

/** A heading one level up, where the checklist is a section of the page. */
export const AsSection: Story = {
  args: { titleAs: 'h2' },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('heading', { level: 2, name: 'Make your page stronger' })).toBeInTheDocument()
  },
}

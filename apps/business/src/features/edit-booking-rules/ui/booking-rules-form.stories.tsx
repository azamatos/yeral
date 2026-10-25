/**
 * Settings → Booking rules' form (B-Settings `isRules`, design §8 and §28.5, book B-05, B-41, B-42; COMPONENTS.md
 * «Business/Settings/BookingRules») over a `fetch` that answers like the api, with plain Save and Discard buttons
 * standing in for the page's save bar. Each `PATCH …/settings/rules` body lands in `saved`. The Offline variant (online
 * booking paused) is the Settings page's, which adds the note and the preview; the Wizard variant is the setup flow's
 * rules step (Business/Onboarding/SetupFlow).
 */
import type { Meta, StoryObj } from '@storybook/react-vite'
import type { TeamMember } from '@yeral/contract/team'
import { DEFAULT_RULES, type BookingRules } from '@yeral/domain/rules'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { PageStory } from '@/shared/storybook'
import { useRulesForm } from '../model/use-rules-form'
import { BookingRulesForm } from './booking-rules-form'

const saved: Record<string, unknown>[] = []

const member = (id: string, name: string, level: TeamMember['level']): TeamMember => ({
  id,
  name,
  fullName: null,
  specialization: null,
  phone: '+99365000000',
  level,
  status: 'active',
  hasApp: true,
  bookable: level !== 'admin',
  canAnswerOwn: false,
  ended: null,
  joined: true,
  photo: null,
  invite: null,
})

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** The api's rules and team; `fail`: the save answers with a server error. */
const fakeApi =
  ({ rules: start = {}, team = [], fail = false }: { rules?: Partial<BookingRules>; team?: TeamMember[]; fail?: boolean } = {}) =>
  (): typeof fetch => {
    // as the api answers: the rules with the lateness every business has
    let rules: BookingRules & { lateMinutes: number } = { ...DEFAULT_RULES, lateMinutes: 15, ...start }
    saved.length = 0
    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const request = new Request(input, init)
      const route = `${request.method} ${new URL(request.url).pathname.replace(/^\/v1/, '')}`
      if (route === 'GET /w/glow-studio/settings/rules') return json(rules)
      if (route === 'PATCH /w/glow-studio/settings/rules') {
        if (fail) return json({ error: { code: 'internal' } }, 500)
        const body = (await request.json()) as Record<string, unknown>
        saved.push(body)
        rules = { ...rules, ...body }
        return json(rules)
      }
      if (route === 'GET /w/glow-studio/team') return json({ items: [member('owner', 'Maýsa', 'owner'), ...team] })
      return json({ error: { code: 'not_found' } }, 404)
    }
  }

function Harness() {
  const rules = useRulesForm('glow-studio', true)
  if (!rules) return <p>Loading</p>
  return (
    <div className="max-w-180 p-6">
      <BookingRulesForm rules={rules} />
      <div className="flex gap-3">
        <button type="button" disabled={!rules.dirty} onClick={rules.discard}>
          Discard
        </button>
        <button type="button" disabled={!rules.dirty || !rules.valid || rules.saving} onClick={() => void rules.save()}>
          Save
        </button>
      </div>
    </div>
  )
}

const meta = {
  title: 'Business/Settings/BookingRules',
  component: PageStory,
  parameters: { layout: 'fullscreen' },
  args: { routes: { '/': Harness }, server: fakeApi() },
} satisfies Meta<typeof PageStory>
export default meta
type Story = StoryObj<typeof meta>

/**
 * A one-person business in manual mode: confirmation, the hold, when clients can book and cancelling, with no «Who
 * answers requests?». Changing several rules saves only those, in one request.
 */
export const Manual: Story = {
  play: async ({ canvas }) => {
    const hold = await canvas.findByRole('combobox', { name: 'Hold requests for' })
    await expect(hold).toHaveValue('30')
    await expect(canvas.queryByRole('radiogroup', { name: 'Who answers requests?' })).toBeNull()
    await expect(canvas.getByRole('button', { name: 'Save' })).toBeDisabled()
    await userEvent.selectOptions(canvas.getByRole('combobox', { name: 'Minimum notice' }), 'No limit')
    await userEvent.selectOptions(canvas.getByRole('combobox', { name: 'How far ahead clients can book' }), '90 days')
    await userEvent.click(canvas.getByRole('radio', { name: '30 min' }))
    await expect(canvas.getByText('Clients see free times like this: 10:00, 10:30, 11:00…')).toBeVisible()
    await userEvent.click(canvas.getByRole('switch', { name: 'Ask clients for a reason when they cancel' }))
    const noShows = canvas.getByRole('group', { name: 'Turn off online booking after no-shows' })
    await expect(noShows).toHaveTextContent('2 times')
    await userEvent.click(within(noShows).getByRole('button', { name: 'Fewer' }))
    await userEvent.click(within(noShows).getByRole('button', { name: 'Fewer' }))
    await expect(noShows).toHaveTextContent('Off')
    await expect(canvas.getByText('Off: clients who didn’t come can still book online.')).toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(saved).toEqual([{ leadMinutes: 0, windowDays: 90, slotStep: 30, askCancelReason: false, blockAfterNoShows: 0 }]),
    )
    await waitFor(() => expect(canvas.getByRole('button', { name: 'Save' })).toBeDisabled())
  },
}

/**
 * Switching to instant confirmation hides the hold and says waiting requests keep their timers; switching back drops
 * the note, and Discard puts back what's saved.
 */
export const ModeChange: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole('radio', { name: /Instant confirmation/ }))
    await expect(canvas.queryByRole('combobox', { name: 'Hold requests for' })).toBeNull()
    await expect(canvas.getByText('Requests already waiting keep their timers; new bookings follow the new setting.')).toBeVisible()
    await userEvent.click(canvas.getByRole('radio', { name: /I confirm/ }))
    await expect(canvas.queryByText(/Requests already waiting keep their timers/)).toBeNull()
    await userEvent.click(canvas.getByRole('radio', { name: /Instant confirmation/ }))
    await userEvent.click(canvas.getByRole('button', { name: 'Discard' }))
    await expect(canvas.getByRole('radio', { name: /I confirm/ })).toBeChecked()
    await expect(canvas.getByRole('combobox', { name: 'Hold requests for' })).toBeVisible()
  },
}

/** With an admin on the team, manual mode asks who answers requests; the choice saves alone. */
export const WithTeam: Story = {
  args: { server: fakeApi({ team: [member('aya', 'Aýna', 'admin')] }) },
  play: async ({ canvas }) => {
    const who = await canvas.findByRole('radiogroup', { name: 'Who answers requests?' })
    await expect(within(who).getByRole('radio', { name: /Both/ })).toBeChecked()
    await userEvent.click(within(who).getByRole('radio', { name: /Each specialist/ }))
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(saved).toEqual([{ requestAnswerers: 'each' }]))
  },
}

/**
 * The buffer's «Other…» starts at 25 and takes 1 to 120 whole minutes (figures only, three at most): outside them the
 * box is invalid with «Enter 1 to 120 minutes.» and Save waits; a number in range saves as the buffer.
 */
export const CustomBuffer: Story = {
  play: async ({ canvas }) => {
    await userEvent.selectOptions(await canvas.findByRole('combobox', { name: 'Buffer' }), 'Other…')
    const minutes = canvas.getByRole('textbox', { name: 'Buffer, minutes' })
    await expect(minutes).toHaveValue('25')
    await expect(minutes).toHaveAccessibleDescription(/Free time kept after each service/)
    await userEvent.clear(minutes)
    await userEvent.type(minutes, '1.5x0')
    await expect(minutes).toHaveValue('150')
    await expect(minutes).toHaveAttribute('aria-invalid', 'true')
    await expect(canvas.getByRole('alert')).toHaveTextContent('Enter 1 to 120 minutes.')
    await expect(minutes).toHaveAccessibleDescription(/Enter 1 to 120 minutes\./)
    await expect(canvas.getByRole('button', { name: 'Save' })).toBeDisabled()
    await userEvent.clear(minutes)
    await userEvent.type(minutes, '45')
    await expect(canvas.queryByRole('alert')).toBeNull()
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(saved).toEqual([{ bufferMinutes: 45 }]))
  },
}

/** A buffer Settings saved that isn't a preset (45 min) opens on «Other…» with its minutes. */
export const StoredOtherBuffer: Story = {
  args: { server: fakeApi({ rules: { bufferMinutes: 45 } }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole('combobox', { name: 'Buffer' })).toHaveValue('other')
    await expect(canvas.getByRole('textbox', { name: 'Buffer, minutes' })).toHaveValue('45')
    await expect(canvas.getByRole('button', { name: 'Save' })).toBeDisabled()
  },
}

/** Lateness is the same for every business: a fixed row, no control. Instant mode from the start shows no hold. */
export const Instant: Story = {
  args: { server: fakeApi({ rules: { confirmMode: 'instant', cancelWindowMinutes: null } }) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText('Clients may be up to 15 min late')).toBeVisible()
    await expect(canvas.getByText('Fixed')).toBeVisible()
    await expect(canvas.queryByRole('combobox', { name: 'Hold requests for' })).toBeNull()
    await expect(canvas.getByRole('combobox', { name: 'Clients can cancel for free' })).toHaveValue('any')
  },
}

/** A save that fails keeps the edits and says why in a toast; Save stays on to try again. */
export const SaveFails: Story = {
  args: { server: fakeApi({ fail: true }) },
  play: async ({ canvas }) => {
    await userEvent.selectOptions(await canvas.findByRole('combobox', { name: 'Minimum notice' }), '24 h')
    await userEvent.click(canvas.getByRole('button', { name: 'Save' }))
    const toast = await within(document.body).findByText('Something went wrong. Please try again.')
    await waitFor(() => expect(toast).toBeVisible())
    await expect(canvas.getByRole('combobox', { name: 'Minimum notice' })).toHaveValue('1440')
    await expect(canvas.getByRole('button', { name: 'Save' })).toBeEnabled()
  },
}

import { expect, userEvent, waitFor, within } from 'storybook/test'

const body = within(document.body)

/** Picks `date` in a field's month (DatePicker, `@yeral/ui`), moving a month at a time to it: the Hours and Team stories. */
export async function pickDate(scope: Pick<typeof body, 'getByRole'>, label: string, date: string) {
  await userEvent.click(scope.getByRole('button', { name: new RegExp(`^${label} `) }))
  // a neighbouring month's days are there too, hidden and without a button
  const day = () => body.getByRole('grid').querySelector<HTMLButtonElement>(`[data-day="${date}"]:not([data-hidden]) button`)
  await body.findByRole('grid')
  for (let i = 0; i < 24 && !day(); i++) {
    const shown = body.getByRole('grid').querySelector('[data-day]:not([data-hidden])')?.getAttribute('data-day') ?? ''
    await userEvent.click(body.getByRole('button', { name: date < shown ? 'Previous month' : 'Next month' }))
  }
  await userEvent.click(day()!)
  await waitFor(() => expect(body.queryByRole('grid')).toBeNull())
}

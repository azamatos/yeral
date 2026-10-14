/** Tabs — underline tabs (DS `.tab`): business page sections, My bookings «Gelýän / Geçen». */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect, userEvent } from 'storybook/test'
import { cn } from '../../lib/cn'
import { tabClass, Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

const meta = { title: 'Selection/Tabs', component: Tabs } satisfies Meta<typeof Tabs>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="up" className="max-w-160">
      <TabsList>
        <TabsTrigger value="up" count={3}>
          Gelýän
        </TabsTrigger>
        <TabsTrigger value="past" count={5}>
          Geçen
        </TabsTrigger>
      </TabsList>
      <TabsContent value="up" className="pt-6">
        Gelýän ýazylyşlar
      </TabsContent>
      <TabsContent value="past" className="pt-6">
        Geçen ýazylyşlar
      </TabsContent>
    </Tabs>
  ),
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('tab', { name: /Geçen/ }))
    await expect(canvas.getByRole('tabpanel')).toHaveTextContent('Geçen ýazylyşlar')
    await userEvent.keyboard('{ArrowLeft}')
    await expect(canvas.getByRole('tab', { name: /Gelýän/ })).toHaveAttribute('aria-selected', 'true')
  },
}

/** The business page section nav is links to anchors, not ARIA tabs: use `tabClass` with `aria-current`. */
export const SectionLinks: Story = {
  render: () => (
    <nav aria-label="Bölümler" className="flex gap-8 border-b border-n-200">
      {[
        ['#hyzmatlar', 'Hyzmatlar'],
        ['#hunarmenler', 'Hünärmenler'],
        ['#teswirler', 'Teswirler'],
        ['#barada', 'Barada'],
      ].map(([href, label], i) => (
        <a key={href} href={href} aria-current={i === 0 ? 'page' : undefined} className={cn(tabClass)}>
          {label}
        </a>
      ))}
    </nav>
  ),
}

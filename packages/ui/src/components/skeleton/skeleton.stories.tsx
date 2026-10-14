/** Skeletons — lists load with skeletons, not spinners (States board → «loading skeleton»). */
import type { Meta, StoryObj } from '@storybook/react-vite'
import { Skeleton } from './skeleton'

const meta = { title: 'Display/Skeleton', component: Skeleton } satisfies Meta<typeof Skeleton>
export default meta
type Story = StoryObj<typeof meta>

export const ResultRow: Story = {
  render: () => (
    <div className="grid max-w-205 grid-cols-[200px_1fr] gap-5" role="status" aria-busy="true" aria-label="Ýüklenýär">
      <Skeleton className="h-37.5 rounded-m" />
      <div className="flex flex-col gap-3 py-1">
        <Skeleton className="h-5 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <div className="mt-2 flex gap-2">
          <Skeleton className="h-10 w-18 rounded-s" />
          <Skeleton className="h-10 w-18 rounded-s" />
          <Skeleton className="h-10 w-18 rounded-s" />
        </div>
      </div>
    </div>
  ),
}

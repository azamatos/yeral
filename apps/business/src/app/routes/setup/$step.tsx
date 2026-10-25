import { createFileRoute } from '@tanstack/react-router'
import { SetupPage } from '@/pages/setup'

// `?another=true`: someone already in a business asked to create another one (the switcher), so the wizard skips its
// "You already have a business" choice
export const Route = createFileRoute('/setup/$step')({
  validateSearch: (search: Record<string, unknown>): { another?: true } => (search.another === true ? { another: true } : {}),
  component: SetupPage,
})

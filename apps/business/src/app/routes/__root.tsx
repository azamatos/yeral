import { createRootRouteWithContext, Outlet, useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { ErrorPage } from '@/pages/error'
import { NotFoundPage } from '@/pages/not-found'
import type { Api } from '@/shared/api'

export const Route = createRootRouteWithContext<Api>()({
  component: Outlet,
  notFoundComponent: NotFoundPage,
  errorComponent: RootError,
})

function RootError({ reset }: ErrorComponentProps) {
  const router = useRouter()
  return (
    <ErrorPage
      onRetry={() => {
        reset()
        void router.invalidate()
      }}
    />
  )
}

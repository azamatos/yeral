import { useQueryErrorResetBoundary } from '@tanstack/react-query'
import { createRootRouteWithContext, Outlet, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { ErrorPage } from '@/pages/error'
import { NotFoundPage } from '@/pages/not-found'
import type { Api } from '@/shared/api'

export const Route = createRootRouteWithContext<Api>()({
  component: Outlet,
  notFoundComponent: NotFoundPage,
  errorComponent: RootError,
})

/**
 * A failed screen. The queries that failed into it are let go, so they ask again when the screen comes back; Try
 * again reloads the routes, which also clears the error (TanStack Router + Query's pattern).
 */
function RootError() {
  const router = useRouter()
  const queryErrors = useQueryErrorResetBoundary()
  useEffect(() => {
    queryErrors.reset()
  }, [queryErrors])
  return <ErrorPage onRetry={() => void router.invalidate()} />
}

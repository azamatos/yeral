'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { isMock } from '@/api'
import { demoTick } from '@/api/mock'
import { subscribe } from '@/api/mock/db'
import { ToastProvider } from '@/components/ui/toast'

/** Mock only: refetch when the mock DB changes (this tab or another), and let «auto» salons answer. */
function MockBridge({ client }: { client: QueryClient }) {
  useEffect(() => {
    if (!isMock) return
    let t: number | undefined
    const off = subscribe(() => {
      window.clearTimeout(t)
      t = window.setTimeout(() => client.invalidateQueries(), 60)
    })
    const i = window.setInterval(demoTick, 2000)
    return () => {
      off()
      window.clearInterval(i)
    }
  }, [client])
  return null
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 } },
      }),
  )
  return (
    <QueryClientProvider client={client}>
      <MockBridge client={client} />
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  )
}

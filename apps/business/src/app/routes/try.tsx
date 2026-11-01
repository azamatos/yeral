import { createFileRoute } from '@tanstack/react-router'
import { TryPage } from '@/pages/try'

export const Route = createFileRoute('/try')({ component: TryPage })

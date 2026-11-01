import { createFileRoute } from '@tanstack/react-router'
import { clientSearch, ClientPage } from '@/pages/client'

export const Route = createFileRoute('/w/$slug/clients_/$id')({ validateSearch: clientSearch, component: ClientPage })

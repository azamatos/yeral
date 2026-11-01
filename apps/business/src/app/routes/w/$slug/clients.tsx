import { createFileRoute } from '@tanstack/react-router'
import { clientsSearch, ClientsPage } from '@/pages/clients'

export const Route = createFileRoute('/w/$slug/clients')({ validateSearch: clientsSearch, component: ClientsPage })

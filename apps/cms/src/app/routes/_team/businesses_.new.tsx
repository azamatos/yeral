import { createFileRoute } from '@tanstack/react-router'
import { AddBusinessPage } from '@/pages/add-business'

export const Route = createFileRoute('/_team/businesses_/new')({ component: AddBusinessPage })

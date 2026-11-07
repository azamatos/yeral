import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ADMIN_BUSINESS_VIEWS, type AdminBusinessItem, type AdminBusinessView } from '@yeral/contract/admin'
import { formatPhone } from '@yeral/domain/phone'
import { Button } from '@yeral/ui/button'
import { EmptyState } from '@yeral/ui/empty-state'
import { Input } from '@yeral/ui/input'
import { Skeleton } from '@yeral/ui/skeleton'
import { CellNote, Table, TableCell, TableColumnHeader, TableFrame, TableHeader, TableRow } from '@yeral/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@yeral/ui/tabs'
import { Building2, Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useFormatter, useTranslations } from 'use-intl'
import { BusinessStateBadge, businessState, useChangesText } from '@/entities/business'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { TeamPage } from '@/widgets/team-shell'

const COLUMNS = 'minmax(220px, 2fr) minmax(120px, 1fr) minmax(110px, 1fr) minmax(170px, 1.2fr) 130px 110px'

/**
 * `/businesses` (book F-179): the queue first, the longest waiting on top, and the other views beside it. Everything the
 * list shows is in the address.
 */
export function BusinessesPage({ view = 'review', q }: { view?: AdminBusinessView; q?: string }) {
  const t = useTranslations('businesses')
  const sdk = useSdk()
  const navigate = useNavigate()
  const errorText = useErrorText()
  const list = useQuery(sdk.admin.businesses({ view, q }))
  const [typed, setTyped] = useState(q ?? '')

  const open = (next: AdminBusinessView, search: string | undefined) =>
    void navigate({ to: '/businesses', search: { ...(next === 'review' ? {} : { view: next }), ...(search ? { q: search } : {}) } })
  const submit = (event: FormEvent) => {
    event.preventDefault()
    open(view, typed.trim() || undefined)
  }

  return (
    <TeamPage
      title={t('title')}
      actions={
        <Button asChild variant="primary" size="s">
          <Link to="/businesses/new">
            <Plus aria-hidden />
            {t('add')}
          </Link>
        </Button>
      }
    >
      <Tabs value={view} onValueChange={(next) => open(next as AdminBusinessView, q)}>
        <TabsList aria-label={t('views.label')}>
          {ADMIN_BUSINESS_VIEWS.map((v) => (
            <TabsTrigger key={v} value={v}>
              {t(`views.${v}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={view} className="flex flex-col gap-4 pt-4">
          <form role="search" onSubmit={submit} className="max-w-90">
            <Input
              type="search"
              aria-label={t('search')}
              placeholder={t('search')}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
            />
          </form>
          {list.error ? (
            <EmptyState icon={<Building2 />} title={errorText(list.error)} />
          ) : !list.data ? (
            <Skeleton className="h-56" />
          ) : list.data.items.length === 0 ? (
            <EmptyState icon={<Building2 />} title={q ? t('emptySearch') : t(`empty.${view}`)} />
          ) : (
            <BusinessesTable items={list.data.items} />
          )}
        </TabsContent>
      </Tabs>
    </TeamPage>
  )
}

/** A row says what there is to look at again: a new name waiting, and what a live business changed (Q-215, Q-275). */
function BusinessesTable({ items }: { items: AdminBusinessItem[] }) {
  const t = useTranslations('businesses')
  const format = useFormatter()
  const changes = useChangesText()
  return (
    <TableFrame>
      <Table columns={COLUMNS} aria-label={t('title')}>
        <TableHeader>
          <TableColumnHeader>{t('columns.business')}</TableColumnHeader>
          <TableColumnHeader>{t('columns.category')}</TableColumnHeader>
          <TableColumnHeader>{t('columns.city')}</TableColumnHeader>
          <TableColumnHeader>{t('columns.owner')}</TableColumnHeader>
          <TableColumnHeader>{t('columns.since')}</TableColumnHeader>
          <TableColumnHeader>{t('columns.state')}</TableColumnHeader>
        </TableHeader>
        {items.map((b) => (
          <TableRow key={b.id}>
            <TableCell>
              <Link to="/businesses/$id" params={{ id: b.id }} className="font-semibold text-a-600 hover:underline">
                {b.name}
              </Link>
              <CellNote>{b.slug}</CellNote>
              {b.pendingName && <CellNote>{t('newName', { name: b.pendingName.name })}</CellNote>}
              {b.recheck && <CellNote>{t('changed', { what: changes(b.recheck.what) })}</CellNote>}
            </TableCell>
            <TableCell>{b.category.name}</TableCell>
            <TableCell>{b.city.name}</TableCell>
            <TableCell>
              {b.owner?.name ?? t('noOwnerName')}
              {b.owner && <CellNote>{formatPhone(b.owner.phone)}</CellNote>}
            </TableCell>
            <TableCell>
              {format.dateTime(b.sentForReviewAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </TableCell>
            <TableCell className="items-start">
              <BusinessStateBadge state={businessState(b)} />
            </TableCell>
          </TableRow>
        ))}
      </Table>
    </TableFrame>
  )
}

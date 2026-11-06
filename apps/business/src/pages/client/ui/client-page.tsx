import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router'
import type { BusinessHours } from '@yeral/domain/hours'
import { levelCan, type Level } from '@yeral/domain/permissions'
import { today } from '@yeral/domain/time'
import { isApiError } from '@yeral/sdk'
import { BackLink } from '@yeral/ui/back-link'
import { Button } from '@yeral/ui/button'
import { useClock } from '@yeral/ui/clock'
import { EmptyState } from '@yeral/ui/empty-state'
import { Spinner } from '@yeral/ui/spinner'
import { Plus, UserX } from 'lucide-react'
import { useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useWorkspace, WorkspacePage } from '@/widgets/workspace-shell'
import { HISTORY_MAX, HISTORY_STEP, type ClientSearch } from '../model/search'
import { ClientAside } from './client-aside'
import { ClientHistory, ClientUpcoming } from './client-bookings'
import { ClientEdit } from './client-edit'
import { ClientHead } from './client-head'
import { ClientNotes } from './client-notes'
import { ClientReports } from './client-reports'
import { ClientStats } from './client-stats'
import { DeleteClientModal } from './delete-client-modal'

/**
 * The client card (B-Client, book B-34–B-36): the head, the key figures, notes, what's ahead, the history, reports, and
 * the side with the switches and Delete client. A specialist reads their own bookings with the client, adds notes, and
 * changes nothing else; a client who isn't theirs (or is gone) says so.
 */
export function ClientPage() {
  const { workspace } = useWorkspace()
  const { id } = useParams({ strict: false })
  if (!workspace || !id) return null
  return <Client key={`${workspace.slug}/${id}`} slug={workspace.slug} id={id} level={workspace.level} staffId={workspace.staffId} />
}

function Client({ slug, id, level, staffId }: { slug: string; id: string; level: Level; staffId?: string }) {
  const t = useTranslations('clientCard')
  const clients = useTranslations('clients')
  const sections = useTranslations('shell.sections')
  const locale = useLocale()
  const sdk = useSdk()
  const now = useClock()
  const navigate = useNavigate()
  const search: ClientSearch = useSearch({ strict: false })
  const [editing, setEditing] = useState(false)
  const specialist = level === 'specialist'
  const manage = !specialist
  const todayDate = today(now)
  // the same page with another address: the person stays where they read (a longer history, the delete question on a
  // phone, under the card); the router would scroll to the top otherwise (the owner's #12)
  const go = (patch: Partial<ClientSearch>) =>
    void navigate({ to: '.', search: (prev: ClientSearch) => ({ ...prev, ...patch }), replace: true, resetScroll: false })

  const shown = search.history ?? HISTORY_STEP
  const query = useQuery({
    ...sdk.clients.card(slug, id, { lang: locale, ...(search.history ? { history: search.history } : {}) }),
    placeholderData: keepPreviousData,
    retry: false,
  })
  const hours = useQuery({ ...sdk.settings.hours(slug), enabled: manage, retry: false })
  const business: BusinessHours | null = hours.data ? { hours: hours.data.hours, exceptions: hours.data.specialDays } : null
  const card = query.data
  const missing = isApiError(query.error, 'not_found') || isApiError(query.error, 'forbidden')

  if (query.isError && !card && !missing) throw query.error

  const back = (
    <BackLink asChild>
      <Link to="/w/$slug/clients" params={{ slug }}>
        <span className="max-sm:sr-only">{sections('clients')}</span>
      </Link>
    </BackLink>
  )

  if (missing)
    return (
      <WorkspacePage title={t('title')} back={back}>
        <EmptyState
          icon={<UserX aria-hidden />}
          title={t('noAccess')}
          description={specialist ? t('noAccessHint') : undefined}
          action={
            <Button asChild variant="secondary" size="s">
              <Link to="/w/$slug/clients" params={{ slug }}>
                {t('backToClients')}
              </Link>
            </Button>
          }
        />
      </WorkspacePage>
    )

  return (
    <WorkspacePage
      title={card ? (card.name ?? clients('unnamed')) : t('title')}
      back={back}
      actions={
        card &&
        !editing && (
          <Button asChild variant="primary" size="s" className="max-sm:w-11 max-sm:px-0">
            <Link to="/w/$slug/calendar" params={{ slug }} search={{ panel: 'new', client: id }}>
              <Plus aria-hidden />
              <span className="max-sm:sr-only">{clients('book')}</span>
            </Link>
          </Button>
        )
      }
    >
      {!card ? (
        <div className="flex justify-center py-16">
          <Spinner label={t('loading')} />
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-10">
          <div className="flex min-w-0 flex-[999_1_560px] flex-col">
            {editing ? (
              <ClientEdit slug={slug} card={card} today={todayDate} onDone={() => setEditing(false)} />
            ) : (
              <ClientHead card={card} manage={manage} onEdit={() => setEditing(true)} />
            )}
            <ClientStats card={card} now={now} money={!specialist && levelCan(level, 'revenue')} specialist={specialist} />
            <ClientNotes slug={slug} card={card} />
            <ClientUpcoming slug={slug} bookings={card.upcoming} now={now} business={business} />
            <ClientHistory
              bookings={card.history}
              more={card.moreHistory && shown < HISTORY_MAX}
              loading={query.isFetching}
              onMore={() => go({ history: Math.min(shown + HISTORY_STEP, HISTORY_MAX) })}
            />
            <ClientReports slug={slug} card={card} now={now} viewer={{ level, staffId }} />
          </div>
          <ClientAside slug={slug} card={card} manage={manage} onDelete={() => go({ remove: true })} />
          {search.remove && manage && (
            <DeleteClientModal
              slug={slug}
              card={card}
              now={now}
              business={business}
              onDeleted={() => void navigate({ to: '/w/$slug/clients', params: { slug } })}
              onClose={() => go({ remove: undefined })}
            />
          )}
        </div>
      )}
    </WorkspacePage>
  )
}

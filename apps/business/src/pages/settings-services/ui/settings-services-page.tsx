import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Menu } from '@yeral/contract/services'
import { localized } from '@yeral/domain/model'
import { useFmt } from '@yeral/i18n'
import { AvatarStack } from '@yeral/ui/avatar-stack'
import { Spinner } from '@yeral/ui/spinner'
import { Switch } from '@yeral/ui/switch'
import { toast } from '@yeral/ui/toast'
import { useId, useMemo } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { SettingsPage } from '@/widgets/settings-frame'
import { useWorkspace } from '@/widgets/workspace-shell'
import { teamLookup, whoDoes } from '../model/rows'

type Service = Menu['groups'][number]['services'][number]
type Lookup = ReturnType<typeof teamLookup>

/**
 * The row's columns (B-Services `.srow`): the name, duration, price, who does it, online. They follow the pane's width
 * (a container query), not the window's, since the sidebar and the settings menu take their share: from 760 all of
 * them; narrower without «Who does it»; under 520 the name with a line under it (duration · price · who) and the
 * switch, as the board's phone.
 */
const ROW =
  'grid grid-cols-[minmax(200px,1.6fr)_96px_132px_minmax(140px,1fr)_92px] items-center gap-x-3 px-2 @max-[760px]:grid-cols-[minmax(0,1fr)_88px_120px_84px] @max-[520px]:grid-cols-[minmax(0,1fr)_52px] @max-[520px]:px-1'

/**
 * Settings → Services (B-Services, design §8 «Hyzmatlar» and §28.6, book B-38): the menu as clients see it, group by
 * group — each service's name and description, its length with its own buffer, its price (a price at the place with
 * the amount clients don't see), who does it (invited people counted apart) and whether clients can book it online,
 * switched at once. The whole width of the pane, a table's.
 */
export function SettingsServicesPage() {
  const { workspace } = useWorkspace()
  if (!workspace) return null
  return <ServicesSection slug={workspace.slug} />
}

function ServicesSection({ slug }: { slug: string }) {
  const t = useTranslations('settings.services')
  const locale = useLocale()
  const sdk = useSdk()
  const menu = useQuery(sdk.settings.menu(slug))
  // «Who does it» names the team: the list doesn't wait for it, and says nothing there until it's in
  const team = useQuery({ ...sdk.team.list(slug), retry: false })
  const lookup = useMemo(() => (team.data ? teamLookup(team.data.items) : null), [team.data])

  // a failed refetch keeps what's on screen; only a first load that failed is a failure
  if (!menu.data && menu.isError) throw menu.error
  if (!menu.data)
    return (
      <SettingsPage section="services" wide>
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      </SettingsPage>
    )

  const groups = menu.data.groups
  const services = groups.reduce((n, g) => n + g.services.length, 0)

  return (
    <SettingsPage section="services" wide lead={t('lead', { services, groups: groups.length })}>
      <div className="@container">
        <div className="flex flex-col">
          <div aria-hidden className={`${ROW} min-h-10 border-y border-n-200 text-label text-n-500 uppercase @max-[520px]:hidden`}>
            <span>{t('columns.service')}</span>
            <span>{t('columns.duration')}</span>
            <span>{t('columns.price')}</span>
            <span className="@max-[760px]:hidden">{t('columns.who')}</span>
            <span>{t('columns.online')}</span>
          </div>
          {groups.map((g) => (
            <Group key={g.id} slug={slug} name={localized(g.name, locale)} services={g.services} lookup={lookup} />
          ))}
        </div>
      </div>
    </SettingsPage>
  )
}

function Group({ slug, name, services, lookup }: { slug: string; name: string; services: Service[]; lookup: Lookup | null }) {
  const t = useTranslations('settings.services')
  const headId = useId()
  return (
    <div role="group" aria-labelledby={headId}>
      <div className="flex min-h-15 items-center gap-2 border-b border-n-200 px-2 pt-4 pb-2 @max-[520px]:px-1 @max-[520px]:pt-3">
        <h3 id={headId} className="m-0 text-[17px] leading-6 font-semibold tracking-[-0.01em] text-n-900">
          {name}
        </h3>
        <span className="text-dense text-n-600">{t('count', { n: services.length })}</span>
      </div>
      {services.length ? (
        services.map((s) => <ServiceRow key={s.id} slug={slug} service={s} lookup={lookup} />)
      ) : (
        <p className="m-0 border-b border-n-200 px-2 py-3.5 text-small text-n-600">{t('emptyGroup')}</p>
      )}
    </div>
  )
}

function ServiceRow({ slug, service, lookup }: { slug: string; service: Service; lookup: Lookup | null }) {
  const t = useTranslations('settings.services')
  const fmt = useFmt()
  const sdk = useSdk()
  const queryClient = useQueryClient()
  const errorText = useErrorText()
  const locale = useLocale()
  const update = useMutation(sdk.settings.updateService(slug))
  const name = localized(service.name, locale)
  const description = service.description ? localized(service.description, locale) : ''
  const duration = fmt.duration(service.durationMin)
  const price = fmt.price({ type: service.priceType, amount: service.priceAmount })
  const team = lookup && whoDoes(service.staffIds, lookup)
  const who =
    team &&
    (team.people.length === 0
      ? t('noOne')
      : team.people.length === 1 && team.people[0]
        ? team.people[0].name
        : t('specialists', { n: team.people.length }))
  // the switch shows where it's going while it saves
  const online = update.isPending && update.variables?.online !== undefined ? update.variables.online : service.online

  const flip = (on: boolean) => {
    if (update.isPending) return
    update.mutate(
      { serviceId: service.id, online: on },
      {
        onSuccess: (saved) => {
          // the answer is what the business has now, whether or not the menu's refetch comes back
          queryClient.setQueryData(
            sdk.settings.menu(slug).queryKey,
            (menu) =>
              menu && { groups: menu.groups.map((g) => ({ ...g, services: g.services.map((s) => (s.id === saved.id ? saved : s)) })) },
          )
          toast(on ? t('openedOnline', { name }) : t('closedOnline', { name }))
        },
        onError: (error) => toast(errorText(error)),
      },
    )
  }

  return (
    <div className={`${ROW} min-h-15 border-b border-n-200 py-2 text-small text-n-900 hover:bg-n-50 @max-[520px]:py-2.5`}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[15px] leading-5 font-semibold">{name}</span>
        {description && <span className="text-dense text-n-600">{description}</span>}
        <span className="hidden text-dense text-n-600 @max-[520px]:block">
          {who ? t('meta', { duration, price, who }) : t('metaShort', { duration, price })}
        </span>
      </div>
      <div className="flex min-w-0 flex-col gap-0.5 @max-[520px]:hidden">
        <span className="tabular-nums">{duration}</span>
        {service.bufferMin !== null && (
          <span className="text-dense text-n-600">
            {service.bufferMin === 0 ? t('noBuffer') : t('buffer', { duration: fmt.duration(service.bufferMin) })}
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5 @max-[520px]:hidden">
        <span className="font-semibold tabular-nums">{price}</span>
        {service.priceType === 'hidden' && service.priceAmount > 0 && (
          <span className="text-dense text-n-600 tabular-nums">{t('hiddenAmount', { amount: fmt.money(service.priceAmount) })}</span>
        )}
      </div>
      <div className="flex min-w-0 items-center gap-2 @max-[760px]:hidden">
        {team && (
          <>
            {team.people.length > 0 && <AvatarStack people={team.people.map((p) => ({ id: p.id, name: p.name, src: p.photo?.url }))} />}
            <span className="flex min-w-0 flex-col">
              <span className={`truncate ${team.people.length === 0 ? 'font-semibold text-danger-ink' : ''}`}>{who}</span>
              {team.invited > 0 && <span className="text-dense text-n-600">{t('invited', { n: team.invited })}</span>}
            </span>
          </>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Switch
          aria-label={t('onlineLabel', { name })}
          checked={online}
          onCheckedChange={flip}
          aria-busy={update.isPending || undefined}
          className="-ml-1.5 @max-[520px]:ml-0"
        />
        {!online && <span className="text-micro text-n-600 @max-[520px]:hidden">{t('notOnline')}</span>}
      </div>
    </div>
  )
}

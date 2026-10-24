import { useMutation, useQuery } from '@tanstack/react-query'
import type { Menu } from '@yeral/contract/services'
import type { TeamMember } from '@yeral/contract/team'
import { localized } from '@yeral/domain/model'
import { useFmt } from '@yeral/i18n'
import { Avatar } from '@yeral/ui/avatar'
import { Spinner } from '@yeral/ui/spinner'
import { Switch } from '@yeral/ui/switch'
import { toast } from '@yeral/ui/toast'
import { useId } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { SettingsPage } from '@/widgets/settings-frame'
import { useWorkspace } from '@/widgets/workspace-shell'
import { whoDoes } from '../model/rows'

type Service = Menu['groups'][number]['services'][number]

/**
 * The row's columns (B-Services `.srow`): the name, duration, price, who does it, online. From 1024 all of them; under
 * 1024 without «Who does it»; on a phone the name with a line under it (duration · price · who) and the switch.
 */
const ROW =
  'grid grid-cols-[minmax(200px,1.6fr)_96px_132px_minmax(140px,1fr)_92px] items-center gap-x-3 px-2 max-[1023px]:grid-cols-[minmax(0,1fr)_88px_120px_84px] max-sm:grid-cols-[minmax(0,1fr)_52px] max-sm:px-1'

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
  // «Who does it» names the team: the list doesn't wait for it
  const team = useQuery({ ...sdk.team.list(slug), retry: false })

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
  const members = team.data?.items ?? []

  return (
    <SettingsPage section="services" wide lead={t('lead', { services, groups: groups.length })}>
      <div className="flex flex-col">
        <div aria-hidden className={`${ROW} min-h-10 border-y border-n-200 text-label text-n-500 uppercase max-sm:hidden`}>
          <span>{t('columns.service')}</span>
          <span>{t('columns.duration')}</span>
          <span>{t('columns.price')}</span>
          <span className="max-[1023px]:hidden">{t('columns.who')}</span>
          <span>{t('columns.online')}</span>
        </div>
        {groups.map((g) => (
          <Group key={g.id} slug={slug} name={localized(g.name, locale)} services={g.services} team={members} />
        ))}
      </div>
    </SettingsPage>
  )
}

function Group({ slug, name, services, team }: { slug: string; name: string; services: Service[]; team: TeamMember[] }) {
  const t = useTranslations('settings.services')
  const headId = useId()
  return (
    <div role="group" aria-labelledby={headId}>
      <div className="flex min-h-15 items-center gap-2 border-b border-n-200 px-2 pt-4 pb-2 max-sm:px-1 max-sm:pt-3">
        <h3 id={headId} className="m-0 text-[17px] leading-6 font-semibold tracking-[-0.01em] text-n-900">
          {name}
        </h3>
        <span className="text-dense text-n-600">{t('count', { n: services.length })}</span>
      </div>
      {services.length ? (
        services.map((s) => <ServiceRow key={s.id} slug={slug} service={s} team={team} />)
      ) : (
        <p className="m-0 border-b border-n-200 px-2 py-3.5 text-small text-n-600">{t('emptyGroup')}</p>
      )}
    </div>
  )
}

function ServiceRow({ slug, service, team }: { slug: string; service: Service; team: TeamMember[] }) {
  const t = useTranslations('settings.services')
  const fmt = useFmt()
  const sdk = useSdk()
  const errorText = useErrorText()
  const locale = useLocale()
  const update = useMutation(sdk.settings.updateService(slug))
  const name = localized(service.name, locale)
  const description = service.description ? localized(service.description, locale) : ''
  const duration = fmt.duration(service.durationMin)
  const price = fmt.price({ type: service.priceType, amount: service.priceAmount })
  const { people, invited } = whoDoes(service.staffIds, team)
  const who = people.length === 0 ? t('noOne') : people.length === 1 && people[0] ? people[0].name : t('specialists', { n: people.length })
  // the switch shows where it's going while it saves
  const online = update.isPending && update.variables?.online !== undefined ? update.variables.online : service.online

  const flip = (on: boolean) => {
    if (update.isPending) return
    update.mutate(
      { serviceId: service.id, online: on },
      {
        onSuccess: () => toast(on ? t('openedOnline', { name }) : t('closedOnline', { name })),
        onError: (error) => toast(errorText(error)),
      },
    )
  }

  return (
    <div className={`${ROW} min-h-15 border-b border-n-200 py-2 text-small text-n-900 hover:bg-n-50 max-sm:py-2.5`}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[15px] leading-5 font-semibold">{name}</span>
        {description && <span className="text-dense text-n-600">{description}</span>}
        <span className="hidden text-dense text-n-600 max-sm:block">{t('meta', { duration, price, who })}</span>
      </div>
      <div className="flex min-w-0 flex-col gap-0.5 max-sm:hidden">
        <span className="tabular-nums">{duration}</span>
        {service.bufferMin !== null && (
          <span className="text-dense text-n-600">{service.bufferMin === 0 ? t('noBuffer') : t('buffer', { n: service.bufferMin })}</span>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-0.5 max-sm:hidden">
        <span className="font-semibold tabular-nums">{price}</span>
        {service.priceType === 'hidden' && service.priceAmount > 0 && (
          <span className="text-dense text-n-600 tabular-nums">{t('hiddenAmount', { amount: fmt.money(service.priceAmount) })}</span>
        )}
      </div>
      <div className="flex min-w-0 items-center gap-2 max-[1023px]:hidden">
        {people.length > 0 && (
          <span aria-hidden className="flex flex-none">
            {people.slice(0, 3).map((p, i) => (
              <Avatar
                key={p.id}
                name={p.name}
                src={p.photo?.url}
                size={28}
                decorative
                className={i ? '-ml-2 shadow-[0_0_0_2px_#fff]' : 'shadow-[0_0_0_2px_#fff]'}
              />
            ))}
          </span>
        )}
        <span className="flex min-w-0 flex-col">
          <span className={`truncate ${people.length === 0 ? 'font-semibold text-danger-ink' : ''}`}>{who}</span>
          {invited > 0 && <span className="text-dense text-n-600">{t('invited', { n: invited })}</span>}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <Switch
          aria-label={t('onlineLabel', { name })}
          checked={online}
          onCheckedChange={flip}
          aria-busy={update.isPending || undefined}
          className="-ml-1.5 max-sm:ml-0"
        />
        {!online && <span className="text-micro text-n-600 max-sm:hidden">{t('notOnline')}</span>}
      </div>
    </div>
  )
}

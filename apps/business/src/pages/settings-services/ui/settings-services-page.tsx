import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Menu } from '@yeral/contract/services'
import { localized, type Localized } from '@yeral/domain/model'
import { useFmt } from '@yeral/i18n'
import { AvatarStack } from '@yeral/ui/avatar-stack'
import { Button } from '@yeral/ui/button'
import { Input } from '@yeral/ui/input'
import { Menu as Actions, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@yeral/ui/menu'
import { Spinner } from '@yeral/ui/spinner'
import { Switch } from '@yeral/ui/switch'
import { textLink } from '@yeral/ui/text-link'
import { toast } from '@yeral/ui/toast'
import { Ellipsis, EyeOff, Globe, Pencil, Plus, Trash2 } from 'lucide-react'
import { useId, useMemo, useRef, useState, type ComponentProps, type RefObject } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { GROUP_NAME_MAX } from '@/shared/config'
import { useErrorText } from '@/shared/i18n'
import { writtenIn } from '@/shared/lib'
import { SettingsPage } from '@/widgets/settings-frame'
import { useWorkspace } from '@/widgets/workspace-shell'
import { teamLookup, whoDoes } from '../model/rows'
import { useDeleteService } from './delete-service'
import { ServiceDrawer, type DrawerTarget } from './service-drawer'

type Service = Menu['groups'][number]['services'][number]
type Lookup = ReturnType<typeof teamLookup>

/**
 * The row's columns (B-Services `.srow`): the name, duration, price, who does it, online, actions. They follow the
 * pane's width (a container query), not the window's, since the sidebar and the settings menu take their share: from
 * 760 all of them; narrower without «Who does it»; under 520 the name with a line under it (duration · price · who),
 * the switch and the actions, as the board's phone. Rows sit in their group's card, so the columns' heading above
 * takes the card's border as an inset too.
 */
const ROW =
  'grid grid-cols-[minmax(200px,1.6fr)_96px_132px_minmax(140px,1fr)_92px_40px] items-center gap-x-3 px-4 @max-[760px]:grid-cols-[minmax(0,1fr)_88px_120px_84px_40px] @max-[520px]:grid-cols-[minmax(0,1fr)_52px_40px] @max-[520px]:px-3'

/**
 * Settings → Services (B-Services, design §8 «Hyzmatlar» and §28.6, book B-38): the menu as clients see it, group by
 * group — each service's name and description, its length with its own buffer, its price (a price at the place with
 * the amount clients don't see), who does it (invited people counted apart) and whether clients can book it online,
 * switched at once. A service's name (or its menu's Edit) opens it in the drawer; «Add service» opens a new one, «Add
 * group» a group at the end; a row's menu and the drawer delete a service, a group's menu adds one there or deletes an
 * empty group. The whole width of the pane, a table's.
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
  const [target, setTarget] = useState<DrawerTarget | null>(null)
  // the button that opened the drawer takes the focus back
  const opener = useRef<HTMLElement | null>(null)
  const open = (to: DrawerTarget, from: HTMLElement) => {
    opener.current = from
    setTarget(to)
  }
  // a service deleted while its drawer is open (beside the page from 1280) closes it
  const deletion = useDeleteService(slug, (gone) =>
    setTarget((open) => (open && 'service' in open && open.service.id === gone.id ? null : open)),
  )
  const [addingGroup, setAddingGroup] = useState(false)
  const addGroupButton = useRef<HTMLButtonElement>(null)

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
  const first = groups[0]
  const openId = target && 'service' in target ? target.service.id : null

  return (
    <SettingsPage
      section="services"
      wide
      lead={t('lead', { services, groups: groups.length })}
      action={
        <div className="flex flex-wrap gap-2 max-sm:w-full max-sm:[&>*]:flex-auto">
          <Button ref={addGroupButton} variant="secondary" size="s" aria-expanded={addingGroup} onClick={() => setAddingGroup(true)}>
            <Plus aria-hidden />
            {t('addGroup')}
          </Button>
          {first && (
            <Button variant="primary" size="s" aria-haspopup="dialog" onClick={(e) => open({ groupId: first.id }, e.currentTarget)}>
              <Plus aria-hidden />
              {t('addService')}
            </Button>
          )}
        </div>
      }
    >
      {addingGroup && (
        <NewGroup
          slug={slug}
          onDone={() => {
            setAddingGroup(false)
            // the box goes with the focus in it
            requestAnimationFrame(() => addGroupButton.current?.focus())
          }}
        />
      )}
      <div className="@container">
        {/* each group its own card (the owner, 25.10.2026): the name in a tinted band above its services */}
        <div className="flex flex-col gap-4">
          <div aria-hidden className={`${ROW} min-h-9 border-x border-transparent text-label text-n-500 uppercase @max-[520px]:hidden`}>
            <span>{t('columns.service')}</span>
            <span>{t('columns.duration')}</span>
            <span>{t('columns.price')}</span>
            <span className="@max-[760px]:hidden">{t('columns.who')}</span>
            <span>{t('columns.online')}</span>
            <span />
          </div>
          {groups.map((g) => (
            <Group
              key={g.id}
              slug={slug}
              groupId={g.id}
              name={localized(g.name, locale)}
              written={g.name}
              services={g.services}
              lookup={lookup}
              openId={openId}
              onOpen={(service, from) => open({ service }, from)}
              onAdd={(from) => open({ groupId: g.id }, from)}
              onDelete={deletion.ask}
              onGroupDeleted={() => setTarget((t) => (t && 'groupId' in t && t.groupId === g.id ? null : t))}
            />
          ))}
        </div>
      </div>
      <ServiceDrawer
        slug={slug}
        target={target}
        groups={groups}
        team={team.data?.items ?? (team.isError ? 'failed' : null)}
        onClose={() => setTarget(null)}
        onDelete={(service) => {
          setTarget(null)
          deletion.ask(service, opener.current)
        }}
        returnFocus={opener}
      />
      {deletion.modal}
    </SettingsPage>
  )
}

/**
 * A group's name box (B-Services `.ngf`): Enter or the save button sends the name, Escape or «Cancel» closes the box,
 * neither while it's on its way (the box would go before it hears how it went). The api's limit, 60 characters.
 */
function GroupNameField({
  initial,
  saveLabel,
  savingLabel,
  pending,
  size,
  onSave,
  onCancel,
  ...input
}: {
  initial: string
  saveLabel: string
  savingLabel: string
  pending: boolean
  size: 'm' | 's'
  onSave: (name: string) => void
  onCancel: () => void
} & Pick<ComponentProps<typeof Input>, 'id' | 'aria-label' | 'placeholder' | 'ref' | 'onFocus' | 'className'>) {
  const t = useTranslations('settings.services')
  const [name, setName] = useState(initial)
  const text = name.trim()
  // Enter pressed again while it's on its way sends nothing more
  const save = () => {
    if (text && !pending) onSave(text)
  }
  const cancel = () => {
    if (!pending) onCancel()
  }
  return (
    <>
      <Input
        {...input}
        autoFocus
        maxLength={GROUP_NAME_MAX}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            save()
          }
          if (e.key === 'Escape') cancel()
        }}
      />
      <Button variant="ghost" size={size} disabled={pending} onClick={cancel}>
        {t('cancel')}
      </Button>
      <Button variant="secondary" size={size} disabled={!text} loading={pending} loadingLabel={savingLabel} onClick={save}>
        {saveLabel}
      </Button>
    </>
  )
}

/** «Add group» (B-Services `.ngf`): the name adds a group at the end of the list. */
function NewGroup({ slug, onDone }: { slug: string; onDone: () => void }) {
  const t = useTranslations('settings.services')
  const locale = useLocale()
  const sdk = useSdk()
  const errorText = useErrorText()
  const add = useMutation(sdk.settings.addGroup(slug))
  const labelId = useId()
  return (
    <div role="group" aria-labelledby={labelId} className="mb-6 flex flex-col gap-2 rounded-card border border-n-200 bg-n-50 p-4">
      <label id={labelId} htmlFor={`${labelId}-input`} className="text-dense font-semibold text-n-900">
        {t('newGroupName')}
      </label>
      <div className="flex flex-wrap gap-2">
        <GroupNameField
          id={`${labelId}-input`}
          className="h-11 min-w-0 flex-[1_1_240px]"
          placeholder={t('newGroupPlaceholder')}
          initial=""
          size="m"
          saveLabel={t('addGroup')}
          savingLabel={t('adding')}
          pending={add.isPending}
          onCancel={onDone}
          onSave={(name) =>
            add.mutate(
              { name: { [locale]: name } },
              {
                onSuccess: () => {
                  toast(t('groupAdded', { name }))
                  onDone()
                },
                onError: (error) => toast(errorText(error)),
              },
            )
          }
        />
      </div>
      <span className="text-dense text-n-600">{t('newGroupNote')}</span>
    </div>
  )
}

/**
 * «Rename group» (the owner, 25.10.2026; not drawn: the «Add group» box in the group's band): the name as it is, saved
 * in the reader's language (the market's others kept) and put in the menu at once; the same name changes nothing.
 */
function RenameGroup({
  slug,
  groupId,
  name,
  names,
  inputRef,
  onDone,
}: {
  slug: string
  groupId: string
  name: string
  names: Localized
  inputRef: RefObject<HTMLInputElement | null>
  onDone: () => void
}) {
  const t = useTranslations('settings.services')
  const locale = useLocale()
  const sdk = useSdk()
  const queryClient = useQueryClient()
  const errorText = useErrorText()
  const rename = useMutation(sdk.settings.renameGroup(slug))
  return (
    <div className="flex min-w-0 flex-[1_1_320px] flex-wrap items-center gap-2">
      <GroupNameField
        ref={inputRef}
        aria-label={t('groupNameLabel', { name })}
        className="h-10 min-w-0 flex-[1_1_200px] bg-n-0"
        onFocus={(e) => e.currentTarget.select()}
        initial={name}
        size="s"
        saveLabel={t('renameSave')}
        savingLabel={t('renaming')}
        pending={rename.isPending}
        onCancel={onDone}
        onSave={(next) => {
          if (next === name) return onDone()
          rename.mutate(
            { groupId, name: writtenIn(names, locale, next) },
            {
              onSuccess: (group) => {
                // the answer is the group as it is now, whether or not the menu's refetch comes back
                queryClient.setQueryData(
                  sdk.settings.menu(slug).queryKey,
                  (menu) => menu && { groups: menu.groups.map((g) => (g.id === group.id ? { ...g, name: group.name } : g)) },
                )
                toast(t('groupRenamed', { name: next }))
                onDone()
              },
              onError: (error) => toast(errorText(error)),
            },
          )
        }}
      />
    </div>
  )
}

function Group({
  slug,
  groupId,
  name,
  written: names,
  services,
  lookup,
  openId,
  onOpen,
  onAdd,
  onDelete,
  onGroupDeleted,
}: {
  slug: string
  groupId: string
  name: string
  /** Every language of its name: a rename keeps the market's others. */
  written: Localized
  services: Service[]
  lookup: Lookup | null
  openId: string | null
  onOpen: (service: Service, from: HTMLElement) => void
  onAdd: (from: HTMLElement) => void
  onDelete: (service: Service, from?: HTMLElement | null) => void
  onGroupDeleted: () => void
}) {
  const t = useTranslations('settings.services')
  const sdk = useSdk()
  const errorText = useErrorText()
  const removeGroup = useMutation(sdk.settings.deleteGroup(slug))
  const headId = useId()
  const actions = useRef<HTMLButtonElement>(null)
  const [renaming, setRenaming] = useState(false)
  // «Rename group» chosen: the menu closing gives the focus to the name box, not back to its button
  const renameInput = useRef<HTMLInputElement>(null)
  const toRename = useRef(false)
  return (
    <div role="group" aria-labelledby={headId} className="overflow-hidden rounded-card border border-n-200 bg-n-0">
      <div className="flex min-h-14 flex-wrap items-center gap-x-2 gap-y-1 border-b border-n-200 bg-group py-2 pr-2 pl-4 @max-[520px]:pl-3">
        <h3 id={headId} className={`m-0 text-[17px] leading-6 font-semibold tracking-[-0.01em] text-n-900 ${renaming ? 'sr-only' : ''}`}>
          {name}
        </h3>
        {renaming ? (
          <RenameGroup
            slug={slug}
            groupId={groupId}
            name={name}
            names={names}
            inputRef={renameInput}
            onDone={() => {
              setRenaming(false)
              // the box goes with the focus in it
              requestAnimationFrame(() => actions.current?.focus())
            }}
          />
        ) : (
          <span className="text-dense text-n-600">{t('count', { n: services.length })}</span>
        )}
        <span className="flex-1" />
        <Actions>
          <MenuTrigger asChild>
            <Button ref={actions} variant="ghost" iconOnly aria-label={t('groupActions', { name })} className="size-9">
              <Ellipsis />
            </Button>
          </MenuTrigger>
          <MenuContent
            onCloseAutoFocus={(e) => {
              if (!toRename.current) return
              toRename.current = false
              e.preventDefault()
              renameInput.current?.focus()
            }}
          >
            <MenuItem onSelect={() => actions.current && onAdd(actions.current)}>
              <Plus aria-hidden />
              {t('addHereMenu')}
            </MenuItem>
            <MenuItem
              onSelect={() => {
                toRename.current = true
                setRenaming(true)
              }}
            >
              <Pencil aria-hidden />
              {t('renameGroup')}
            </MenuItem>
            {services.length ? (
              <MenuItem disabled className="h-auto min-h-10 flex-wrap py-1.5">
                <Trash2 aria-hidden />
                {t('deleteGroup')}
                <span className="basis-full pl-7.5 text-dense">{t('deleteGroupBlocked')}</span>
              </MenuItem>
            ) : (
              <MenuItem
                className="text-danger-ink [&_svg]:text-danger-ink"
                onSelect={() =>
                  removeGroup.mutate(groupId, {
                    onSuccess: () => {
                      onGroupDeleted()
                      toast(t('groupDeleted', { name }))
                    },
                    onError: (error) => toast(errorText(error)),
                  })
                }
              >
                <Trash2 aria-hidden />
                {t('deleteGroup')}
              </MenuItem>
            )}
          </MenuContent>
        </Actions>
      </div>
      {services.length ? (
        services.map((s) => (
          <ServiceRow
            key={s.id}
            slug={slug}
            service={s}
            lookup={lookup}
            open={openId === s.id}
            onOpen={(from) => onOpen(s, from)}
            onDelete={(from) => onDelete(s, from)}
          />
        ))
      ) : (
        <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3.5 text-small text-n-600 @max-[520px]:px-3">
          {t('emptyGroup')}
          <button
            type="button"
            aria-haspopup="dialog"
            aria-label={t('addHereLabel', { group: name })}
            className={textLink}
            onClick={(e) => onAdd(e.currentTarget)}
          >
            {t('addHere')}
          </button>
        </p>
      )}
    </div>
  )
}

function ServiceRow({
  slug,
  service,
  lookup,
  open,
  onOpen,
  onDelete,
}: {
  slug: string
  service: Service
  lookup: Lookup | null
  /** Its drawer is open: the row in the tint. */
  open: boolean
  onOpen: (from: HTMLElement) => void
  onDelete: (from: HTMLElement | null) => void
}) {
  const t = useTranslations('settings.services')
  const fmt = useFmt()
  const sdk = useSdk()
  const queryClient = useQueryClient()
  const errorText = useErrorText()
  const locale = useLocale()
  const update = useMutation(sdk.settings.updateService(slug))
  const actions = useRef<HTMLButtonElement>(null)
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
    <div
      className={`${ROW} relative min-h-15 border-b border-n-200 py-2 text-small text-n-900 last:border-b-0 @max-[520px]:py-2.5 ${open ? 'bg-a-50' : 'hover:bg-n-50'}`}
    >
      <div className="flex min-w-0 flex-col gap-0.5">
        {/* the whole row opens it (B-Services `.rbtn::after`); the switch and the menu sit above */}
        <button
          type="button"
          aria-haspopup="dialog"
          className="cursor-pointer self-start border-0 bg-transparent p-0 text-left text-[15px] leading-5 font-semibold text-n-900 after:absolute after:inset-0 after:rounded-xs focus-visible:outline-none focus-visible:after:shadow-[inset_0_0_0_2px_var(--color-a-400)]"
          onClick={(e) => onOpen(e.currentTarget)}
        >
          {name}
        </button>
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
      <div className="relative z-1 flex flex-wrap items-center gap-1">
        <Switch
          aria-label={t('onlineLabel', { name })}
          checked={online}
          onCheckedChange={flip}
          aria-busy={update.isPending || undefined}
          className="-ml-1.5 @max-[520px]:ml-0"
        />
        {!online && <span className="text-micro text-n-600 @max-[520px]:hidden">{t('notOnline')}</span>}
      </div>
      <div className="relative z-1 flex justify-end">
        <Actions>
          <MenuTrigger asChild>
            <Button ref={actions} variant="ghost" iconOnly aria-label={t('rowActions', { name })} className="size-9">
              <Ellipsis />
            </Button>
          </MenuTrigger>
          <MenuContent>
            <MenuItem onSelect={() => actions.current && onOpen(actions.current)}>
              <Pencil aria-hidden />
              {t('edit')}
            </MenuItem>
            <MenuItem onSelect={() => flip(!online)}>
              {online ? <EyeOff aria-hidden /> : <Globe aria-hidden />}
              {online ? t('hideOnline') : t('openOnline')}
            </MenuItem>
            <MenuSeparator />
            <MenuItem className="text-danger-ink [&_svg]:text-danger-ink" onSelect={() => onDelete(actions.current)}>
              <Trash2 aria-hidden />
              {t('deleteService')}
            </MenuItem>
          </MenuContent>
        </Actions>
      </div>
    </div>
  )
}

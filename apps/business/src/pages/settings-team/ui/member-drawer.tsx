import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { Menu } from '@yeral/contract/services'
import type { TeamMember } from '@yeral/contract/team'
import { MARKET } from '@yeral/domain/market'
import { formatPhone, maskPhone } from '@yeral/domain/phone'
import { INVITE_DAYS } from '@yeral/domain/team'
import { diffDays, today } from '@yeral/domain/time'
import { PHONE_RULES } from '@yeral/features/auth-by-phone'
import { useFmt } from '@yeral/i18n'
import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from '@yeral/ui/drawer'
import { Field } from '@yeral/ui/field'
import { Input } from '@yeral/ui/input'
import { PhoneInput } from '@yeral/ui/phone-input'
import { Select } from '@yeral/ui/select'
import { Switch } from '@yeral/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@yeral/ui/tabs'
import { textLink } from '@yeral/ui/text-link'
import { toast } from '@yeral/ui/toast'
import { Info, Lock } from 'lucide-react'
import { useId, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useFormatter, useLocale, useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { TEAM_NAME_MAX } from '@/shared/config'
import { useErrorText } from '@/shared/i18n'
import { formOf, invitePending, isDirty, phoneEditable, phoneEditProblem, saveOf, type MemberForm } from '../model/member'
import { ServicePicker } from './service-picker'

const FULL_NAME_MAX = 80
const SPECIALIZATION_MAX = 60
const TABS = ['profile', 'services', 'access'] as const
type Tab = (typeof TABS)[number]

/**
 * The staff drawer (B-Team `sd`, design §28.4, book B-45, B-46): a team member's Profile (the name clients see, the
 * full name the team sees, the specialization, the phone of someone without the app), Services (what they do, in the
 * menu's groups) and Access level (the level with what it means, a specialist's «Uses the app», their right to answer
 * their own requests). One Save sends what changed. The administrator sees it all and changes only the services.
 */
export function MemberDrawer({
  slug,
  member,
  people,
  menu,
  owner,
  myPhone,
  returnFocus,
  onClose,
  onLink,
}: {
  slug: string
  member: TeamMember | null
  people: TeamMember[]
  menu: Menu
  /** The one looking is the owner (an administrator changes only the services). */
  owner: boolean
  myPhone: string | null
  returnFocus: RefObject<HTMLElement | null>
  onClose: () => void
  onLink: (name: string, url: string) => void
}) {
  // nothing closes it while a save runs: its answer, or its error, needs the form
  const busy = useRef(false)
  return (
    <Drawer scrim="auto" open={member !== null} onOpenChange={(open) => !open && !busy.current && onClose()} returnFocus={returnFocus}>
      {member && (
        <DrawerContent>
          <MemberEditor
            key={member.id}
            slug={slug}
            member={member}
            people={people}
            menu={menu}
            owner={owner}
            me={!!myPhone && member.phone === myPhone}
            onBusy={(b) => {
              busy.current = b
            }}
            onClose={onClose}
            onLink={onLink}
          />
        </DrawerContent>
      )}
    </Drawer>
  )
}

function MemberEditor({
  slug,
  member: m,
  people,
  menu,
  owner,
  me,
  onBusy,
  onClose,
  onLink,
}: {
  slug: string
  member: TeamMember
  people: TeamMember[]
  menu: Menu
  owner: boolean
  me: boolean
  onBusy: (busy: boolean) => void
  onClose: () => void
  onLink: (name: string, url: string) => void
}) {
  const t = useTranslations('settings.team.drawer')
  const words = useTranslations('setup.team')
  const levels = useTranslations('levels')
  const tc = useTranslations('common')
  const format = useFormatter()
  const fmt = useFmt()
  const locale = useLocale()
  const sdk = useSdk()
  const errorText = useErrorText()
  const id = useId()
  const rules = useQuery(sdk.settings.rules(slug))
  const update = useMutation(sdk.team.update(slug))
  const setServices = useMutation(sdk.team.setServices(slug))
  const resend = useMutation(sdk.team.resendInvite(slug))
  const [now] = useState(() => Date.now())
  const [was] = useState(() => formOf(m, menu, now))
  const [form, setForm] = useState<MemberForm>(was)
  const [tab, setTab] = useState<Tab>('profile')
  const [saving, setSaving] = useState(false)
  const change = (patch: Partial<MemberForm>) => setForm((f) => ({ ...f, ...patch }))

  const ownerRow = m.level === 'owner'
  const specialist = form.level === 'specialist'
  // clients see and pick them: a specialist, or anyone doing a service (B-Team `kindOf`)
  const pro = specialist || form.serviceIds.length > 0
  const name = form.name.trim() || m.name
  const editPhone = owner && phoneEditable(m)
  const phoneChanged = editPhone && form.phone !== was.phone
  const phoneProblem = phoneChanged ? phoneEditProblem(form.phone, m, people) : null
  const pending = invitePending(m, now)
  const masked = form.phone ? maskPhone(form.phone) : ''
  const valid = form.name.trim().length > 0 && !phoneProblem
  const dirty = isDirty(was, form)
  const canSave = owner || tab === 'services'

  const phoneHint =
    !m.hasApp && !pending
      ? t('phoneHint.noApp')
      : pending && !m.joined
        ? t('phoneHint.invited')
        : t('phoneHint.signsIn', { brand: tc('brand') })
  const phoneError =
    phoneProblem === 'incomplete'
      ? t('phoneProblems.incomplete', { digits: MARKET.phone.length })
      : phoneProblem === 'notMobile'
        ? words('notMobile', { starts: format.list(MARKET.phone.mobilePrefixes, { type: 'disjunction' }) })
        : phoneProblem && t('phoneProblems.onTeam')
  const appCaption =
    form.app && was.app
      ? pending
        ? t('appCap.waiting', { name })
        : t('appCap.signsIn', { phone: masked })
      : form.app
        ? t('appCap.turnOn', { phone: masked, days: INVITE_DAYS })
        : was.app
          ? pending
            ? t('appCap.cancel', { name })
            : t('appCap.turnOff', { name })
          : t('appCap.none')
  const rule = rules.data ? t(`rules.${rules.data.requestAnswerers}`) : ''
  const daysLeft = m.invite ? Math.max(1, diffDays(today(m.invite.expiresAt), today(now))) : 0

  const save = async () => {
    if (saving || !valid || !dirty) return
    const plan = saveOf(m, was, form, locale)
    onBusy(true)
    setSaving(true)
    try {
      if (plan.update) await update.mutateAsync({ staffId: m.id, ...plan.update })
      if (plan.serviceIds) await setServices.mutateAsync({ staffId: m.id, serviceIds: plan.serviceIds })
      const saved = form.name.trim()
      if (plan.invite) {
        const sent = await resend.mutateAsync(m.id)
        const until = sent.member.invite ? fmt.dayMonth(today(sent.member.invite.expiresAt)) : ''
        toast(t('inviteCreated', { name: saved, date: until }), {
          action: { label: t('copyLink'), onClick: () => onLink(saved, sent.link) },
        })
      } else if (plan.update?.hasApp === false) toast(pending ? t('inviteCancelled', { name: saved }) : t('appOff', { name: saved }))
      else toast(t('saved', { name: saved }))
      onBusy(false)
      onClose()
    } catch (error) {
      onBusy(false)
      toast(errorText(error))
    } finally {
      setSaving(false)
    }
  }
  const copyLink = async () => {
    try {
      onLink(name, (await resend.mutateAsync(m.id)).link)
    } catch (error) {
      toast(errorText(error))
    }
  }

  const readOnlyNote = (
    <p className="m-0 flex items-start gap-2.5 rounded-m bg-group px-3.5 py-3 text-small text-n-900">
      <Info aria-hidden className="mt-px size-4.5 flex-none" strokeWidth={1.75} />
      {t('roNote')}
    </p>
  )

  return (
    <>
      <DrawerHeader
        leading={<Avatar name={m.name} src={m.photo?.url} size={48} letters={1} decorative />}
        title={m.fullName ?? m.name}
        subtitle={[me ? t('you') : m.specialization, levels(m.level)].filter(Boolean).join(' · ')}
        closeLabel={t('close')}
      />
      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)} className="flex min-h-0 flex-1 flex-col">
        <TabsList aria-label={t('tabsLabel')} className="flex-none gap-5 px-4 sm:gap-6 sm:px-6">
          {TABS.map((k) => (
            <TabsTrigger key={k} value={k} className="flex-none">
              {t(`tabs.${k}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <DrawerBody>
          <TabsContent value="profile" className="flex flex-col gap-5">
            {!owner && readOnlyNote}
            <Field
              label={t('name')}
              hint={
                pro &&
                t.rich('clientsSee', {
                  line: [name, form.specialization.trim()].filter(Boolean).join(' · '),
                  b: (chunks: ReactNode) => <b className="font-semibold text-n-900">{chunks}</b>,
                })
              }
            >
              <Input
                value={form.name}
                maxLength={TEAM_NAME_MAX}
                disabled={!owner}
                placeholder={t('namePlaceholder')}
                onChange={(e) => change({ name: e.target.value })}
              />
            </Field>
            <Field label={t('fullName')} optional={t('optional')} hint={t('fullNameHint')}>
              <Input
                value={form.fullName}
                maxLength={FULL_NAME_MAX}
                disabled={!owner}
                placeholder={t('fullNamePlaceholder')}
                onChange={(e) => change({ fullName: e.target.value })}
              />
            </Field>
            <Field label={t('specialization')} optional={t('optional')}>
              <Input
                value={form.specialization}
                maxLength={SPECIALIZATION_MAX}
                disabled={!owner}
                placeholder={t('specializationPlaceholder')}
                onChange={(e) => change({ specialization: e.target.value })}
              />
            </Field>
            <Field label={t('phone')} hint={phoneHint} error={phoneError}>
              {editPhone ? (
                <PhoneInput {...PHONE_RULES} value={form.phone} onValueChange={(phone) => change({ phone })} />
              ) : (
                <Input readOnly value={m.phone ? formatPhone(m.phone) : ''} className="border-n-200 bg-n-50 tabular-nums" />
              )}
            </Field>
          </TabsContent>

          <TabsContent value="services" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-body font-semibold text-n-900">{t('svcQuestion', { name })}</span>
              <span className="text-dense text-n-600">{pro ? t('svcHintPro', { name }) : t('svcHintOff', { name })}</span>
            </div>
            {menu.groups.every((g) => g.services.length === 0) ? (
              <p className="m-0 text-dense text-n-600">{t('noServices')}</p>
            ) : (
              <div className="flex flex-col gap-2">
                <ServicePicker menu={menu} selected={form.serviceIds} onChange={(serviceIds) => change({ serviceIds })} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="access" className="flex flex-col gap-5">
            {ownerRow ? (
              <div className="flex flex-col gap-2.5">
                <span className="text-dense font-semibold text-n-900">{t('level')}</span>
                <p className="m-0 flex items-start gap-2.5 rounded-m bg-group px-3.5 py-3 text-small text-n-900">
                  <Lock aria-hidden className="mt-px size-4.5 flex-none" strokeWidth={1.75} />
                  {t('ownerLevel')}
                </p>
              </div>
            ) : (
              <>
                {!owner && readOnlyNote}
                <Field label={t('level')} hint={owner && !m.hasApp ? t('adminNeedsApp') : undefined}>
                  <Select
                    value={form.level}
                    disabled={!owner}
                    onChange={(e) => change({ level: e.target.value === 'admin' ? 'admin' : 'specialist' })}
                  >
                    <option value="specialist">{levels('specialist')}</option>
                    {/* an administrator always uses the app: they become one once they do */}
                    <option value="admin" disabled={!m.hasApp}>
                      {levels('admin')}
                    </option>
                  </Select>
                </Field>
                <p className="m-0 -mt-2 flex items-start gap-2 rounded-s bg-group px-3 py-2.5 text-dense text-n-600">
                  <Info aria-hidden className="mt-px size-4 flex-none" strokeWidth={1.75} />
                  {words(form.level === 'admin' ? 'adminMeans' : 'specialistMeans')}
                </p>
                <span className="-mt-2 text-dense text-n-600">
                  {t.rich('samePermissions', {
                    link: (chunks: ReactNode) => (
                      <Link to="/w/$slug/settings/permissions" params={{ slug }} className={`${textLink} font-semibold`}>
                        {chunks}
                      </Link>
                    ),
                  })}
                </span>
                {specialist ? (
                  <>
                    <span aria-hidden className="h-px flex-none bg-n-200" />
                    <div className="flex min-h-15 items-center justify-between gap-4 py-1.5">
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span id={`${id}-app`} className="text-body font-medium text-n-900">
                          {t('usesApp')}
                        </span>
                        <span id={`${id}-app-cap`} className="text-dense text-n-600">
                          {appCaption}
                        </span>
                      </span>
                      <Switch
                        checked={form.app}
                        disabled={!owner}
                        aria-labelledby={`${id}-app`}
                        aria-describedby={`${id}-app-cap`}
                        onCheckedChange={(app) => change({ app })}
                      />
                    </div>
                    {form.app && was.app && pending && (
                      <div role="status" className="flex flex-col gap-1.5 rounded-m bg-group px-3.5 py-3 text-small text-n-900">
                        <span className="inline-flex items-center gap-2 font-semibold text-st-pending-ink">
                          <span aria-hidden className="size-1.5 rounded-pill bg-st-pending-dot" />
                          {t('invited')}
                        </span>
                        <span>{t('invitedNote')}</span>
                        {m.invite && (
                          <span className="text-dense text-n-600">
                            {t('invitedCap', { phone: masked, date: fmt.dayMonth(today(m.invite.expiresAt)), n: daysLeft })}
                          </span>
                        )}
                        {owner && (
                          <Button
                            variant="secondary"
                            size="s"
                            className="self-start"
                            disabled={resend.isPending}
                            onClick={() => void copyLink()}
                          >
                            {t('copyLink')}
                          </Button>
                        )}
                      </div>
                    )}
                    {!form.app && (
                      <p className="m-0 flex items-start gap-2.5 rounded-m bg-group px-3.5 py-3 text-small text-n-900">
                        <Lock aria-hidden className="mt-px size-4.5 flex-none" strokeWidth={1.75} />
                        {t('noAppNote', { name })}
                      </p>
                    )}
                    {form.app && m.hasApp && m.joined && (
                      <div className="flex min-h-15 items-center justify-between gap-4 py-1.5">
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span id={`${id}-ans`} className="text-body font-medium text-n-900">
                            {t('answer')}
                          </span>
                          <span id={`${id}-ans-cap`} className="text-dense text-n-600">
                            {form.canAnswerOwn ? t('answerFollows', { rule, name }) : t('answerOff', { rule, name })}
                          </span>
                        </span>
                        <Switch
                          checked={form.canAnswerOwn}
                          disabled={!owner}
                          aria-labelledby={`${id}-ans`}
                          aria-describedby={`${id}-ans-cap`}
                          onCheckedChange={(canAnswerOwn) => change({ canAnswerOwn })}
                        />
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-dense text-n-600">{t('adminCap')}</span>
                )}
              </>
            )}
          </TabsContent>
        </DrawerBody>
      </Tabs>
      <DrawerFooter>
        {canSave ? (
          <Button variant="primary" disabled={!dirty || !valid} loading={saving} loadingLabel={t('saving')} onClick={() => void save()}>
            {t('save')}
          </Button>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            {t('close')}
          </Button>
        )}
      </DrawerFooter>
    </>
  )
}

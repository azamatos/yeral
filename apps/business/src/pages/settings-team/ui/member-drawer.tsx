import { useMutation, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { bookingsAffectedDetailsSchema, type BookingsAffectedDetails } from '@yeral/contract/errors'
import type { Menu } from '@yeral/contract/services'
import type { TeamMember } from '@yeral/contract/team'
import { MARKET } from '@yeral/domain/market'
import { formatPhone, maskPhone } from '@yeral/domain/phone'
import { INVITE_DAYS } from '@yeral/domain/team'
import { today } from '@yeral/domain/time'
import { PHONE_RULES } from '@yeral/features/auth-by-phone'
import { useFmt } from '@yeral/i18n'
import { isApiError } from '@yeral/sdk'
import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { Drawer, DrawerBody, DrawerContent, DrawerFooter, DrawerHeader } from '@yeral/ui/drawer'
import { Field } from '@yeral/ui/field'
import { Input } from '@yeral/ui/input'
import { PhoneInput } from '@yeral/ui/phone-input'
import { Select } from '@yeral/ui/select'
import { Spinner } from '@yeral/ui/spinner'
import { Switch } from '@yeral/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@yeral/ui/tabs'
import { textLink } from '@yeral/ui/text-link'
import { toast } from '@yeral/ui/toast'
import { Info, Lock } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useFormatter, useLocale, useTranslations } from 'use-intl'
import { HoursAffectedBookings, type AffectedChoice } from '@/features/edit-hours'
import { useSdk } from '@/shared/api'
import { FULL_NAME_MAX, SPECIALIZATION_MAX, TEAM_NAME_MAX } from '@/shared/config'
import { useErrorText } from '@/shared/i18n'
import {
  formOf,
  inviteable,
  inviteDaysLeft,
  invitePending,
  isDirty,
  onInvite,
  phoneEditable,
  phoneEditProblem,
  saveOf,
  type MemberForm,
} from '../model/member'
import { sameShift, scheduleWeek, shiftFormOf, shiftValid, type ShiftForm } from '../model/shift'
import { ShiftEditor, TimeOff } from './member-hours'
import { RemoveMember } from './remove-member'
import { ServicePicker } from './service-picker'

const TABS = ['profile', 'services', 'hours', 'access'] as const
type Tab = (typeof TABS)[number]

/**
 * The staff drawer (B-Team `sd`, design §28.4, book B-45, B-46): a team member's Profile (the name clients see, the
 * full name the team sees, the specialization, the phone of someone without the app), Services (what they do, in the
 * menu's groups) and Access level (the level with what it means, a specialist's «Uses the app», their right to answer
 * their own requests). One Save sends what changed. The administrator sees it all and changes only the services.
 */
export function MemberDrawer({
  slug,
  business,
  member,
  people,
  menu,
  owner,
  myPhone,
  returnFocus,
  onClose,
  onRemoved,
  onLink,
}: {
  slug: string
  /** The workspace's name, for «… loses access to Glow Studio». */
  business: string
  member: TeamMember | null
  people: TeamMember[]
  menu: Menu
  /** The one looking is the owner (an administrator changes only the services). */
  owner: boolean
  myPhone: string | null
  returnFocus: RefObject<HTMLElement | null>
  onClose: () => void
  /** Removed from the team: their row leaves for «No longer on the team», so the focus goes elsewhere. */
  onRemoved: () => void
  onLink: (name: string, url: string) => void
}) {
  // nothing closes it while its save runs: the answer, or its error, needs the form (another person's drawer can)
  const [saving, setSaving] = useState<string | null>(null)
  return (
    <Drawer
      scrim="auto"
      open={member !== null}
      onOpenChange={(open) => !open && saving !== member?.id && onClose()}
      returnFocus={returnFocus}
    >
      {member && (
        <DrawerContent>
          <MemberEditor
            key={member.id}
            slug={slug}
            business={business}
            member={member}
            people={people}
            menu={menu}
            owner={owner}
            me={!!myPhone && member.phone === myPhone}
            onBusy={(b) => setSaving(b ? member.id : null)}
            onClose={onClose}
            onRemoved={onRemoved}
            onLink={onLink}
          />
        </DrawerContent>
      )}
    </Drawer>
  )
}

function MemberEditor({
  slug,
  business,
  member: m,
  people,
  menu,
  owner,
  me,
  onBusy,
  onClose,
  onRemoved,
  onLink,
}: {
  slug: string
  business: string
  member: TeamMember
  people: TeamMember[]
  menu: Menu
  owner: boolean
  me: boolean
  onBusy: (busy: boolean) => void
  onClose: () => void
  onRemoved: () => void
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
  const schedule = useQuery(sdk.team.schedule(slug, m.id))
  const businessHours = useQuery(sdk.settings.hours(slug))
  const updateSchedule = useMutation(sdk.team.updateSchedule(slug, m.id))
  const update = useMutation(sdk.team.update(slug))
  const setServices = useMutation(sdk.team.setServices(slug))
  const resend = useMutation(sdk.team.resendInvite(slug))
  const [now] = useState(() => Date.now())
  const [was] = useState(() => formOf(m, menu, now))
  const [form, setForm] = useState<MemberForm>(was)
  // the week as saved, once both the schedule and the business hours are read; the change in the drawer over it
  const week = businessHours.data?.hours
  const wasShift = schedule.data && week ? shiftFormOf(schedule.data, week) : null
  const [shiftDraft, setShift] = useState<ShiftForm | null>(null)
  const shift = shiftDraft ?? wasShift
  const shiftChanged = !!shift && !!wasShift && !!week && !sameShift(wasShift, shift, week)
  // bookings outside the new shift: the 409's list, until Keep them or Cancel and offer 3 other times
  const [shiftAsked, setShiftAsked] = useState<BookingsAffectedDetails | null>(null)
  const [tab, setTab] = useState<Tab>('profile')
  const [removing, setRemoving] = useState(false)
  const [saving, setSaving] = useState(false)
  // the api refused the number (someone who joined once keeps theirs): shown on the field until it changes
  const [phoneLocked, setPhoneLocked] = useState(false)
  // a save that ends after the drawer moved to someone else (or closed) leaves that one alone
  const alive = useRef(true)
  useEffect(
    () => () => {
      alive.current = false
    },
    [],
  )
  const change = (patch: Partial<MemberForm>) => {
    if (patch.phone !== undefined) setPhoneLocked(false)
    setForm((f) => ({ ...f, ...patch }))
  }

  const ownerRow = m.level === 'owner'
  const specialist = form.level === 'specialist'
  // clients see and pick them: a specialist, or anyone doing a service (B-Team `kindOf`)
  const pro = specialist || form.serviceIds.length > 0
  const name = form.name.trim() || m.name
  const editPhone = owner && phoneEditable(m, now)
  const phoneChanged = editPhone && form.phone !== was.phone
  const phoneProblem = phoneChanged ? phoneEditProblem(form.phone, m, people) : null
  const pending = invitePending(m, now)
  // invited, open or ended, or working without the app with one waiting: on the board, `o.status === 'invited'`
  const invited = onInvite(m, now)
  const masked = form.phone ? maskPhone(form.phone) : ''
  // an invite goes to a mobile number: turning the app on asks for one first
  const needsMobile = specialist && !was.app && form.app && !inviteable(form)
  const valid = form.name.trim().length > 0 && !phoneProblem && !phoneLocked && !needsMobile && (!shift || !week || shiftValid(shift, week))
  const dirty = isDirty(was, form) || shiftChanged
  const canSave = owner || tab === 'services' || saving

  const phoneHint =
    !m.hasApp && !invited
      ? t('phoneHint.noApp')
      : invited && !m.joined
        ? t('phoneHint.invited')
        : t('phoneHint.signsIn', { brand: tc('brand') })
  const phoneError = phoneLocked
    ? t('phoneProblems.signsIn')
    : phoneProblem === 'incomplete'
      ? t('phoneProblems.incomplete', { digits: MARKET.phone.length })
      : phoneProblem === 'notMobile'
        ? words('notMobile', { starts: format.list(MARKET.phone.mobilePrefixes, { type: 'disjunction' }) })
        : phoneProblem && t('phoneProblems.onTeam')
  const appCaption = needsMobile
    ? t('appCap.needsMobile')
    : form.app && was.app
      ? invited
        ? t('appCap.waiting', { name })
        : t('appCap.signsIn', { phone: masked })
      : form.app
        ? t('appCap.turnOn', { phone: masked, days: INVITE_DAYS })
        : was.app
          ? invited
            ? t('appCap.cancel', { name })
            : t('appCap.turnOff', { name })
          : t('appCap.none')
  const answerers = rules.data?.requestAnswerers
  const daysLeft = m.invite ? inviteDaysLeft(m.invite, now) : 0

  const save = async (affected?: AffectedChoice) => {
    if (saving || !valid || !dirty) return
    const plan = saveOf(m, was, form, locale, now)
    onBusy(true)
    setSaving(true)
    try {
      // the week first: over bookings it asks before anything else is saved
      let settled: { cancelled: number; kept: number } | null = null
      if (shiftChanged && shift && week && schedule.data) {
        try {
          settled = await updateSchedule.mutateAsync({
            ...scheduleWeek(shift, week),
            daysOff: schedule.data.daysOff,
            ...(affected ? { affected } : {}),
          })
          setShiftAsked(null)
        } catch (error) {
          const listed = isApiError(error, 'bookings_affected') && bookingsAffectedDetailsSchema.safeParse(error.details)
          if (listed && listed.success) {
            setShiftAsked(listed.data)
            onBusy(false)
            return
          }
          throw error
        }
      }
      // the profile and the services apart; an invite after them, to the number just saved
      await Promise.all([
        plan.update && update.mutateAsync({ staffId: m.id, ...plan.update }),
        plan.serviceIds && setServices.mutateAsync({ staffId: m.id, serviceIds: plan.serviceIds }),
      ])
      const saved = form.name.trim()
      if (plan.invite) {
        const sent = await resend.mutateAsync(m.id)
        const until = sent.member.invite ? fmt.dayMonth(today(sent.member.invite.expiresAt)) : ''
        toast(t('inviteCreated', { name: saved, date: until }), {
          action: { label: t('copyLink'), onClick: () => onLink(saved, sent.link) },
        })
      } else if (plan.update?.hasApp === false) toast(invited ? t('inviteCancelled', { name: saved }) : t('appOff', { name: saved }))
      else if (settled)
        toast(
          [
            t('shiftSaved', { name: saved }),
            settled.cancelled ? t('shiftCancelled', { n: settled.cancelled }) : '',
            settled.kept ? t('shiftKept', { n: settled.kept }) : '',
          ]
            .filter(Boolean)
            .join(' · '),
        )
      else toast(t('saved', { name: saved }))
      onBusy(false)
      if (alive.current) onClose()
    } catch (error) {
      onBusy(false)
      const issues = isApiError(error, 'validation_error') && Array.isArray(error.details.issues) ? error.details.issues : []
      if (issues.some((i: { path?: unknown[]; code?: string }) => i.path?.[0] === 'phone' && i.code === 'signs_in')) setPhoneLocked(true)
      else toast(errorText(error))
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

          <TabsContent value="hours" className="flex flex-col gap-5">
            {!owner && (
              <p className="m-0 flex items-start gap-2.5 rounded-m bg-group px-3.5 py-3 text-small text-n-900">
                <Info aria-hidden className="mt-px size-4.5 flex-none" strokeWidth={1.75} />
                {t('roHours')}
              </p>
            )}
            {shift && week && schedule.data ? (
              <>
                <ShiftEditor form={shift} business={week} owner={owner} name={name} onChange={setShift} />
                <span aria-hidden className="h-px flex-none bg-n-200" />
                <TimeOff slug={slug} member={m} schedule={schedule.data} owner={owner} />
              </>
            ) : (
              <div className="flex justify-center py-10">
                <Spinner />
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
                    disabled={!owner || saving}
                    // an administrator always uses the app (B-Team `needsApp`)
                    onChange={(e) => change(e.target.value === 'admin' ? { level: 'admin', app: true } : { level: 'specialist' })}
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
                    {form.app && was.app && invited && (
                      <div role="status" className="flex flex-col gap-1.5 rounded-m bg-group px-3.5 py-3 text-small text-n-900">
                        <span className="inline-flex items-center gap-2 font-semibold text-st-pending-ink">
                          <span aria-hidden className="size-1.5 rounded-pill bg-st-pending-dot" />
                          {t('invited')}
                        </span>
                        <span>{t('invitedNote')}</span>
                        {m.invite && pending && (
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
                    {/* with «Owner and admins» answering, a specialist never does: nothing to switch */}
                    {form.app && m.hasApp && m.joined && answerers && answerers !== 'desk' && (
                      <div className="flex min-h-15 items-center justify-between gap-4 py-1.5">
                        <span className="flex min-w-0 flex-col gap-0.5">
                          <span id={`${id}-ans`} className="text-body font-medium text-n-900">
                            {t('answer')}
                          </span>
                          <span id={`${id}-ans-cap`} className="text-dense text-n-600">
                            {form.canAnswerOwn
                              ? t('answerFollows', { rule: t(`rules.${answerers}`), name })
                              : t('answerOff', { rule: t(`rules.${answerers}`), name })}
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
      {/* «Remove from the team» on the left beside the owner's Save (B-Team `.drw-f`); otherwise the footer's own */}
      <DrawerFooter className={owner && !ownerRow ? 'justify-between [&>*]:flex-none' : undefined}>
        {owner && !ownerRow && (
          <Button
            variant="danger-ghost"
            aria-haspopup="dialog"
            disabled={saving}
            className="-ml-1.5 px-1.5"
            onClick={() => setRemoving(true)}
          >
            {t('remove')}
          </Button>
        )}
        {canSave ? (
          <Button variant="primary" disabled={!dirty || !valid} loading={saving} loadingLabel={t('saving')} onClick={() => void save()}>
            {t('save')}
          </Button>
        ) : (
          <Button variant="secondary" disabled={saving} onClick={onClose}>
            {t('close')}
          </Button>
        )}
      </DrawerFooter>
      <HoursAffectedBookings
        details={shiftAsked}
        lead={shift?.own ? t('shiftLeadOwn') : t('shiftLeadBusiness')}
        saving={saving}
        onSave={(choice) => void save(choice)}
        onClose={() => setShiftAsked(null)}
        words={{
          title: (what, n) => t('shiftTitle', { what, n, name }),
          keepCaption: t('shiftKeep'),
          foot: t('shiftFoot'),
          save: t('save'),
        }}
      />
      {owner && !ownerRow && (
        <RemoveMember slug={slug} member={m} business={business} open={removing} onOpenChange={setRemoving} onRemoved={onRemoved} />
      )}
    </>
  )
}

import { useMutation } from '@tanstack/react-query'
import type { Me } from '@yeral/contract/account'
import type { BusinessDetail } from '@yeral/contract/catalog'
import { NAME_MAX } from '@yeral/domain/names'
import { useCodeDelivery, useCodeOnScreen, useSignIn } from '@yeral/features/auth-by-phone'
import { useFmt } from '@yeral/i18n'
import { useSdk } from '@yeral/sdk/react'
import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { cn } from '@yeral/ui/cn'
import { Field } from '@yeral/ui/field'
import { Input, Textarea } from '@yeral/ui/input'
import { textLink } from '@yeral/ui/text-link'
import { TimeSlot } from '@yeral/ui/time-slots'
import { toast } from '@yeral/ui/toast'
import { Check } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { NOTE_MAX } from '@/entities/booking'
import { useErrorText } from '@/shared/i18n'
import { CodeLeadText, CodeStep, TelegramCaption } from '@/shared/ui'
import { Part } from './part'
import { Rules } from './rules'
import { StepTitle } from './step-title'

// «Is this you?» (an account unused for 6 months, SMS codes only) isn't drawn inline: the site's login takes over then
const LoginModal = lazy(() => import('@/features/log-in').then((m) => ({ default: m.LoginModal })))

/** A time the api offered when the chosen one was just taken (`slot_taken`). */
export type Alternative = { date: string; start: number; end: number }

/** The «Verified» badge (C7-Booking C4.5 `VerifiedPhone`, 20, completed tones, check 12). */
function VerifiedBadge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-5 flex-none items-center gap-1 rounded-pill border border-st-completed-line bg-st-completed-bg pr-[7px] pl-[5px] text-[12px] leading-4 font-semibold whitespace-nowrap text-st-completed-ink">
      <Check aria-hidden className="size-3" strokeWidth={3} />
      {children}
    </span>
  )
}

/**
 * Step 4 (Booking `step=confirm`, book C-18, C-20, C-21; C7-Booking C4.5): the time just taken with the nearest free
 * ones (Booking `slotTaken`), the summary under 1024 (`summary`), then «Your details» done in place — signed in with
 * a name (`me`), the account row (avatar, name, the number with «Verified») and «Not you?», which signs out; signed
 * out, the phone field with «Get the code» (Secondary) and the Telegram code inline, no modal; once verified, the
 * number as a filled read-only field with the badge and Change, and a new account gives its name under it. Then the
 * note for the business and its rules (`Rules`). Sending is the summary's and the bar's «Send booking».
 */
export function ConfirmStep({
  detail,
  me,
  summary,
  note,
  onNote,
  taken,
  onAlternative,
  onOtherTime,
}: {
  detail: BusinessDetail
  /** Who's signed in (named or not yet); null for a guest. */
  me: Me | null
  summary: ReactNode
  note: string
  onNote: (note: string) => void
  /** The chosen time was just taken: the nearest free ones (maybe none). */
  taken: Alternative[] | null
  onAlternative: (alternative: Alternative) => void
  onOtherTime: () => void
}) {
  const t = useTranslations('booking.confirm')
  const login = useTranslations('login')
  const fmt = useFmt()
  const sdk = useSdk()
  const errorText = useErrorText()
  const failed = (error: unknown) => void toast(errorText(error))
  // the «Is this you?» question goes to the site's login; kept once opened, so it closes as it opens
  const [modal, setModal] = useState<boolean | null>(null)
  const details = useRef<HTMLHeadingElement>(null)
  // asked as the step opens, so the phone step's code-on-screen lead is there with it
  useCodeOnScreen()
  const ahead = useCodeDelivery()
  const signIn = useSignIn({
    onVerified: (answer) => {
      if ('isThisYou' in answer) setModal(true)
    },
    onFailed: failed,
  })
  // «Not you?» and Change: out of the account, the number is asked again
  const logout = useMutation(sdk.auth.logout())
  const changeNumber = () => {
    if (logout.isPending) return
    logout.mutate(undefined, { onSuccess: () => signIn.reset(), onError: failed })
  }
  const onCode = signIn.state.step === 'code' && !me

  return (
    <div className="flex flex-col">
      <StepTitle title={t('title')} />
      {taken && (
        <div
          role="alert"
          className="mt-5 flex flex-col gap-3 rounded-ctl-l border border-st-pending-line bg-st-pending-bg p-4 text-st-pending-ink"
        >
          <span className="text-body font-semibold">{taken.length > 0 ? t('taken') : t('takenNone')}</span>
          <div className="flex flex-wrap items-center gap-2">
            {taken.map((a) => (
              <TimeSlot key={`${a.date}-${a.start}`} aria-label={t('pick', { time: fmt.time(a.start) })} onClick={() => onAlternative(a)}>
                {fmt.time(a.start)}
              </TimeSlot>
            ))}
            <button type="button" onClick={onOtherTime} className={`${textLink} ml-2 text-small font-semibold`}>
              {t('otherTime')}
            </button>
          </div>
        </div>
      )}
      <div className="mt-6 md:hidden">{summary}</div>
      <div className="mt-6">
        <Part
          title={onCode ? login('codeTitle') : t('details')}
          titleRef={details}
          lead={
            onCode ? (
              <>
                <CodeLeadText state={signIn.state} />{' '}
                <button type="button" onClick={signIn.changeNumber} className={cn(textLink, 'whitespace-nowrap')}>
                  {login('changeNumber')}
                </button>
              </>
            ) : undefined
          }
        >
          {me?.firstName ? (
            // the account row (C4.5 `AccountRow`): the number with a «Verified» badge, not a loose check (#50)
            <div className="flex items-center gap-3 rounded-ctl-l border border-n-200 bg-n-0 py-3.5 pr-3 pl-4">
              <Avatar name={me.name ?? ''} size={44} decorative />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[15px] leading-5 font-semibold">{me.name}</span>
                <span className="text-n-700 flex flex-wrap items-center gap-2 text-small">
                  {fmt.phone(me.phone)}
                  <VerifiedBadge>{t('verified')}</VerifiedBadge>
                </span>
              </div>
              <Button variant="tertiary" size="s" loading={logout.isPending} onClick={changeNumber}>
                {t('notYou')}
              </Button>
            </div>
          ) : me ? (
            // verified, no name yet (C4.5 «Signed out · 3»): the filled read-only number with the badge and Change, then the name
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <span className="text-small font-semibold">{login('phoneLabel')}</span>
                <div className="flex items-center gap-2">
                  <div
                    role="group"
                    aria-label={t('phoneVerified')}
                    className="flex h-12 w-70 max-w-full items-center gap-2 rounded-ctl-l border border-n-200 bg-n-50 px-3.5 text-ctl-l text-n-900"
                  >
                    <span className="min-w-0 flex-1 truncate">{fmt.phone(me.phone)}</span>
                    <VerifiedBadge>{t('verified')}</VerifiedBadge>
                  </div>
                  <Button variant="tertiary" size="s" aria-label={t('changeNumberLabel')} loading={logout.isPending} onClick={changeNumber}>
                    {t('changeNumber')}
                  </Button>
                </div>
              </div>
              <NameForm onFailed={failed} />
            </div>
          ) : (
            <CodeStep
              steps={signIn}
              inline
              phoneHint={ahead === 'telegram' && signIn.state.step === 'phone' ? <TelegramCaption /> : undefined}
            />
          )}
        </Part>
        <Part>
          <Field
            label={t('note')}
            optional={t('optional')}
            counter={
              note.length > 0
                ? { value: note.length, max: NOTE_MAX, text: t('noteCount', { count: note.length, max: NOTE_MAX }) }
                : undefined
            }
          >
            <Textarea
              value={note}
              maxLength={NOTE_MAX}
              rows={3}
              placeholder={t('notePlaceholder')}
              onChange={(e) => onNote(e.target.value)}
              className="h-24 resize-y"
            />
          </Field>
        </Part>
        <Rules rules={detail.rules} />
      </div>
      {modal !== null && (
        <Suspense fallback={null}>
          <LoginModal
            open={modal}
            onOpenChange={setModal}
            onSignedIn={() => setModal(false)}
            onCloseAutoFocus={(e) => {
              e.preventDefault()
              details.current?.focus()
            }}
          />
        </Suspense>
      )}
    </div>
  )
}

/**
 * A new account's name, in place (C4.5 «a new number also gives a name»; the login's name step, book Q-156): the
 * first name (required) and the surname (optional), saved to the account (`PATCH /v1/me`); the account row takes over.
 */
function NameForm({ onFailed }: { onFailed: (error: unknown) => void }) {
  const t = useTranslations('login.name')
  const words = useTranslations('booking.confirm')
  const sdk = useSdk()
  const update = useMutation(sdk.me.update())
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [missing, setMissing] = useState(false)
  const firstRef = useRef<HTMLInputElement>(null)

  // the name starts in its field, as the login's step does
  useEffect(() => firstRef.current?.focus(), [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (update.isPending) return
    const firstName = first.trim()
    if (!firstName) {
      setMissing(true)
      firstRef.current?.focus()
      return
    }
    update.mutate({ firstName, surname: last.trim() || null }, { onError: onFailed })
  }

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-4">
      <p className="m-0 text-small text-n-600">{words('nameLead')}</p>
      <Field label={t('first')} error={missing ? t('required') : undefined}>
        <Input
          ref={firstRef}
          value={first}
          maxLength={NAME_MAX}
          autoComplete="given-name"
          onChange={(e) => {
            setFirst(e.target.value)
            setMissing(false)
          }}
        />
      </Field>
      <Field label={t.rich('last', { optional: (chunks) => <span className="font-normal text-n-600">{chunks}</span> })}>
        <Input value={last} maxLength={NAME_MAX} autoComplete="family-name" onChange={(e) => setLast(e.target.value)} />
      </Field>
      <div>
        <Button type="submit" variant="secondary" loading={update.isPending}>
          {t('continue')}
        </Button>
      </div>
    </form>
  )
}

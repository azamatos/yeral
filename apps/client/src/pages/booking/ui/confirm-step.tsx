import type { Me } from '@yeral/contract/account'
import type { BusinessDetail } from '@yeral/contract/catalog'
import { useFmt } from '@yeral/i18n'
import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { Field } from '@yeral/ui/field'
import { Textarea } from '@yeral/ui/input'
import { textLink } from '@yeral/ui/text-link'
import { TimeSlot } from '@yeral/ui/time-slots'
import { Check } from 'lucide-react'
import { lazy, Suspense, useRef, useState, type ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { NOTE_MAX } from '@/entities/booking'
import { Part } from './part'
import { Rules } from './rules'
import { StepTitle } from './step-title'

// the login comes over the page only when someone needs it: its steps stay out of the flow's first download
const LoginModal = lazy(() => import('@/features/log-in').then((m) => ({ default: m.LoginModal })))

/** A time the api offered when the chosen one was just taken (`slot_taken`). */
export type Alternative = { date: string; start: number; end: number }

/**
 * Step 4 (Booking `step=confirm`, book C-18, C-20, C-21): the time just taken with the nearest free ones (Booking
 * `slotTaken`), the summary under 1024 (`summary`), who's booking (`person`, signed in with a name: their name and
 * confirmed number; otherwise «Confirm your number», the site's login over the page: number, code, "Is this you?",
 * the name), the note for the business, and the business's rules (`Rules`). Sending is the summary's and the bar's
 * «Send booking».
 */
export function ConfirmStep({
  detail,
  person,
  summary,
  note,
  onNote,
  taken,
  onAlternative,
  onOtherTime,
}: {
  detail: BusinessDetail
  person: Me | null
  summary: ReactNode
  note: string
  onNote: (note: string) => void
  /** The chosen time was just taken: the nearest free ones (maybe none). */
  taken: Alternative[] | null
  onAlternative: (alternative: Alternative) => void
  onOtherTime: () => void
}) {
  const t = useTranslations('booking.confirm')
  const fmt = useFmt()
  // kept once opened, so it closes as it opens and gives the focus back (to the details: its trigger is gone by then)
  const [login, setLogin] = useState<boolean | null>(null)
  const details = useRef<HTMLHeadingElement>(null)
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
        <Part title={t('details')} titleRef={details}>
          {person ? (
            // the account row (C7-Booking C4.5 `AccountRow`): the number with a «Verified» badge, not a loose check (#50)
            <div className="flex items-center gap-3 rounded-ctl-l border border-n-200 bg-n-0 py-3.5 pr-3 pl-4">
              <Avatar name={person.name ?? ''} size={44} decorative />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-[15px] leading-5 font-semibold">{person.name}</span>
                <span className="text-n-700 flex flex-wrap items-center gap-2 text-small">
                  {fmt.phone(person.phone)}
                  <span className="inline-flex h-5 flex-none items-center gap-1 rounded-pill border border-st-completed-line bg-st-completed-bg pr-[7px] pl-[5px] text-[12px] leading-4 font-semibold whitespace-nowrap text-st-completed-ink">
                    <Check aria-hidden className="size-3" strokeWidth={3} />
                    {t('verified')}
                  </span>
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="m-0 text-body text-n-600">{t('detailsLead')}</p>
              <div>
                <Button variant="secondary" onClick={() => setLogin(true)}>
                  {t('confirmNumber')}
                </Button>
              </div>
            </div>
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
      {login !== null && (
        <Suspense fallback={null}>
          <LoginModal
            open={login}
            onOpenChange={setLogin}
            onSignedIn={() => setLogin(false)}
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

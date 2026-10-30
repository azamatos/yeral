import type { Me } from '@yeral/contract/account'
import type { BusinessDetail } from '@yeral/contract/catalog'
import { useFmt } from '@yeral/i18n'
import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { Field } from '@yeral/ui/field'
import { Textarea } from '@yeral/ui/input'
import { textLink } from '@yeral/ui/text-link'
import { TimeSlot } from '@yeral/ui/time-slots'
import { CircleCheck } from 'lucide-react'
import { lazy, Suspense, useRef, useState, type ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { NOTE_MAX } from '@/entities/booking'
import { Rules } from './rules'
import { StepTitle } from './step-title'

// the login comes over the page only when someone needs it: its steps stay out of the flow's first download
const LoginModal = lazy(() => import('@/features/log-in').then((m) => ({ default: m.LoginModal })))

/** A time the api offered when the chosen one was just taken (`slot_taken`). */
export type Alternative = { date: string; start: number; end: number }

/** A part of the step (Booking `.csec`): a line above, 28 apart, its own heading. */
function Part({ title, titleRef, children }: { title?: string; titleRef?: React.Ref<HTMLHeadingElement>; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-n-200 py-7">
      {title && (
        <h2 ref={titleRef} tabIndex={-1} className="m-0 text-[20px] leading-[26px] font-semibold tracking-[-0.015em] focus:outline-none">
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}

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
          className="mt-5 flex flex-col gap-3 rounded-m border border-st-pending-line bg-st-pending-bg p-4 text-st-pending-ink"
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
            <div className="flex items-center gap-3.5">
              <Avatar name={person.name ?? ''} size={44} decorative />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-body font-semibold">{person.name}</span>
                <span className="inline-flex items-center gap-1.5 text-dense text-n-600 tabular-nums">
                  {fmt.phone(person.phone)}
                  <CircleCheck role="img" aria-label={t('verified')} className="size-3.5 text-st-completed-dot" strokeWidth={2} />
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

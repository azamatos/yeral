import { useMutation, useQuery } from '@tanstack/react-query'
import type { Me } from '@yeral/contract/account'
import { NAME_MAX } from '@yeral/domain/names'
import { formatPhone } from '@yeral/domain/phone'
import { useSdk } from '@yeral/sdk/react'
import { Button } from '@yeral/ui/button'
import { Field } from '@yeral/ui/field'
import { Input } from '@yeral/ui/input'
import { SaveBar } from '@yeral/ui/save-bar'
import { toast } from '@yeral/ui/toast'
import { LogOut } from 'lucide-react'
import { useId, useRef, useState, type ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { useLogOut } from '@/features/log-out'
import { useErrorText } from '@/shared/i18n'
import { ChangePhoneBox } from './change-phone-box'
import { DeleteAccount } from './delete-account'

/**
 * `/{lang}/account/profile` — Account-Profile («Profil we sazlamalar»), book C-43, C-44, C-46, C-47: the name
 * businesses see (saved with the save bar), the phone and its change, log out and delete the account. The language
 * section joins with a market's second language (the first launch has one) and the SMS switches (C-45) with the SMS
 * themselves (none reach a phone at the first launch, book Q-036).
 */
export function AccountProfilePage() {
  const t = useTranslations('profile')
  const sdk = useSdk()
  const me = useQuery(sdk.me.get())
  if (!me.data) return null
  return (
    <>
      <h1 className="m-0 mb-6 text-h2">{t('title')}</h1>
      {/* a fresh form for each person (another sign-in) */}
      <Profile key={me.data.id} me={me.data} />
    </>
  )
}

/** One part of the page (`.prow`): its title and line on the left (240), its fields on the right; stacked on phones. */
function Section({ title, lead, children }: { title: string; lead: ReactNode; children: ReactNode }) {
  const id = useId()
  return (
    <section
      aria-labelledby={id}
      className="grid grid-cols-[240px_minmax(0,1fr)] gap-8 border-t border-n-200 py-8 max-sm:grid-cols-[minmax(0,1fr)] max-sm:gap-4 max-sm:py-6"
    >
      <div className="flex flex-col gap-1">
        <h2 id={id} className="m-0 text-[17px] leading-6 font-semibold tracking-[-0.01em]">
          {title}
        </h2>
        <span className="text-dense text-n-600">{lead}</span>
      </div>
      <div className="flex min-w-0 flex-col gap-5">{children}</div>
    </section>
  )
}

/** The name (C-43) and the phone (C-44), the account (C-46, C-47), and the save bar under them while the name changed. */
function Profile({ me }: { me: Me }) {
  const t = useTranslations('profile')
  const sdk = useSdk()
  const errorText = useErrorText()
  const update = useMutation(sdk.me.update())
  const formId = useId()
  const firstRef = useRef<HTMLInputElement>(null)
  const changeRef = useRef<HTMLButtonElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  // only what the person typed: the rest shows the account as it is now (a rename elsewhere shows up, never saved back)
  const [edits, setEdits] = useState<{ first?: string; last?: string }>({})
  const first = edits.first ?? me.firstName ?? ''
  const last = edits.last ?? me.surname ?? ''
  const [changing, setChanging] = useState(false)
  // the api refused a change after all (the code shows on the screen): «Change» goes for this visit
  const [changeRefused, setChangeRefused] = useState(false)
  const firstMissing = first.trim() === ''
  const dirty = first.trim() !== (me.firstName ?? '') || last.trim() !== (me.surname ?? '')
  const canChange = me.canChangePhone && !changeRefused

  const discard = () => {
    setEdits({})
    firstRef.current?.focus()
  }
  const save = () => {
    if (firstMissing || update.isPending) return
    update.mutate(
      { firstName: first.trim(), surname: last.trim() || null },
      {
        onSuccess: () => {
          setEdits({})
          toast(t('saved'))
          // Save went with the save bar: the focus goes back to the name
          if (!document.activeElement || document.activeElement === document.body) firstRef.current?.focus()
        },
        onError: (error) => void toast(errorText(error)),
      },
    )
  }
  /** The phone box closed: the focus goes back to «Change», or to the number when «Change» went. */
  const closeChange = (refused = false) => {
    setChanging(false)
    if (refused) setChangeRefused(true)
    requestAnimationFrame(() => (changeRef.current ?? phoneRef.current)?.focus())
  }

  return (
    <>
      <Section title={t('personal')} lead={t('personalLead')}>
        <form
          id={formId}
          noValidate
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
          className="grid grid-cols-2 gap-4 max-sm:grid-cols-1"
        >
          {/* said once the name is being changed: an account opened without one isn't told off at first sight */}
          <Field label={t('first')} error={dirty && firstMissing ? t('firstRequired') : undefined}>
            <Input
              ref={firstRef}
              value={first}
              maxLength={NAME_MAX}
              autoComplete="given-name"
              onChange={(e) => setEdits((was) => ({ ...was, first: e.target.value }))}
            />
          </Field>
          <Field label={t('last')}>
            <Input
              value={last}
              maxLength={NAME_MAX}
              autoComplete="family-name"
              onChange={(e) => setEdits((was) => ({ ...was, last: e.target.value }))}
            />
          </Field>
        </form>
        <Field label={t('phone')} hint={canChange && !changing ? t('changeLead') : undefined}>
          <div className="flex items-center gap-2">
            <Input
              ref={phoneRef}
              value={formatPhone(me.phone)}
              readOnly
              className="flex-1 border-n-200 bg-n-50 tabular-nums hover:border-n-200"
            />
            {canChange && !changing && (
              <Button ref={changeRef} variant="secondary" size="s" onClick={() => setChanging(true)}>
                {t('change')}
              </Button>
            )}
          </div>
        </Field>
        {changing && (
          <ChangePhoneBox
            currentPhone={me.phone}
            onDone={() => closeChange()}
            onCancel={() => closeChange()}
            onUnavailable={() => closeChange(true)}
          />
        )}
      </Section>
      <AccountSection />
      {dirty && (
        <SaveBar
          form={formId}
          message={t('saveQuestion')}
          label={t('unsaved')}
          discardLabel={t('discard')}
          saveLabel={t('save')}
          savingLabel={t('saving')}
          onDiscard={discard}
          invalid={firstMissing}
          saving={update.isPending}
          className="mt-6"
        />
      )}
    </>
  )
}

/** Log out (C-46) and delete the account (C-47). */
function AccountSection() {
  const t = useTranslations()
  const { logOut, loggingOut } = useLogOut()
  return (
    <Section title={t('profile.account')} lead={t('profile.accountLead')}>
      <div>
        <Button variant="secondary" loading={loggingOut} onClick={logOut}>
          <LogOut aria-hidden />
          {t('account.logOut')}
        </Button>
      </div>
      <div className="h-px bg-n-200" />
      <div className="flex flex-col items-start gap-2">
        <DeleteAccount />
        <span className="text-dense text-n-600">{t('profile.deleteLead')}</span>
      </div>
    </Section>
  )
}

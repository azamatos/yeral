import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { Me } from '@yeral/contract/account'
import { useCodeOnScreen, useSignIn } from '@yeral/features/auth-by-phone'
import { cn } from '@yeral/ui/cn'
import { toast } from '@yeral/ui/toast'
import { WizardFooter } from '@yeral/ui/wizard-footer'
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslations } from 'use-intl'
import { ContactYeralLink } from '@/features/contact-yeral'
import { CodeLead, IdentityStep, NameFields, SignInForm, VerifiedNumber } from '@/features/sign-in'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { textLink } from '@/shared/ui'
import { SetupFrame, StepHeader } from './setup-frame'

/**
 * Step 1 · the phone (B-Onboarding step 1, book B-02): someone signed out signs in or up inside the wizard — the
 * number, the code (on the screen at the first launch), "Is this you?" for an account unused for 6 months — and someone
 * without a name gives it. With the name saved the wizard goes on to the business step (`me` has a name now). Nothing
 * to keep yet, so no «Continue later»; the list's other steps wait.
 */
export function PhoneStep({ me }: { me: Me | null }) {
  const t = useTranslations()
  const sdk = useSdk()
  const errorText = useErrorText()
  const titleId = useId()
  // asked with the account, so the demo note is there when the number opens
  useCodeOnScreen()
  const logout = useMutation(sdk.auth.logout())
  const update = useMutation(sdk.me.update())
  const [identity, setIdentity] = useState<{ name: string | null; ticket: string } | null>(null)
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const firstRef = useRef<HTMLInputElement>(null)
  const failed = (error: unknown) => void toast(errorText(error))
  const signIn = useSignIn({
    onVerified: (answer) => {
      if ('isThisYou' in answer) setIdentity(answer.isThisYou)
    },
    onFailed: failed,
  })

  const signedIn = !!me
  const onCode = !signedIn && signIn.state.step === 'code'
  // the name starts in its field once the number is verified (B-Login focusStep)
  useEffect(() => {
    if (signedIn) firstRef.current?.focus()
  }, [signedIn])

  if (identity)
    return (
      <IdentityStep
        {...identity}
        onAnswered={() => {
          setIdentity(null)
          signIn.reset()
        }}
        onBack={() => {
          setIdentity(null)
          signIn.changeNumber()
        }}
        onExpired={(error) => {
          setIdentity(null)
          signIn.refuseCode(error)
        }}
        onFailed={failed}
        contact={<ContactYeralLink />}
      />
    )

  const brand = t('common.brand')
  const firstName = first.trim()
  const busy = update.isPending || logout.isPending
  const saveName = () => {
    if (!firstName || busy) return
    update.mutate({ firstName, surname: last.trim() || null }, { onError: failed })
  }
  // «Change number» once verified: signed out, the phone step from the start
  const changeNumber = () => !busy && logout.mutate(undefined, { onSuccess: () => signIn.reset(), onError: failed })

  const header = signedIn ? (
    <StepHeader step="phone" title={t('login.name.title')} lead={t('login.name.lead', { brand })} />
  ) : onCode ? (
    <StepHeader step="phone" titleId={titleId} title={t('login.codeTitle')} lead={<CodeLead signIn={signIn} />} />
  ) : (
    <StepHeader step="phone" titleId={titleId} title={t('setup.phone.title', { app: t('app.name', { brand }) })} lead={t('login.lead')} />
  )

  return (
    <SetupFrame
      current="phone"
      reached="phone"
      more={false}
      summaries={{}}
      canOpen={() => false}
      onOpen={() => {}}
      live={update.isPending ? t('setup.saving') : undefined}
      footer={
        <WizardFooter
          hint={
            signedIn ? (firstName ? undefined : t('setup.phone.hintName')) : onCode ? t('setup.phone.hintCode') : t('setup.phone.hintPhone')
          }
          primary={{
            children: t('setup.continue'),
            disabled: !signedIn || !firstName,
            loading: update.isPending,
            loadingLabel: t('setup.saving'),
            onClick: saveName,
          }}
        />
      }
    >
      <section className="flex flex-col gap-8 max-sm:gap-7">
        {header}
        {signedIn ? (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault()
              saveName()
            }}
            className="flex flex-col gap-6"
          >
            <VerifiedNumber
              phone={me.phone}
              action={
                <button type="button" disabled={busy} onClick={changeNumber} className={cn(textLink, 'whitespace-nowrap')}>
                  {t('login.changeNumber')}
                </button>
              }
            />
            <div className="grid max-w-140 grid-cols-2 gap-4 max-sm:grid-cols-1">
              <NameFields first={first} last={last} onFirst={setFirst} onLast={setLast} firstRef={firstRef} />
            </div>
            <p className="-mt-3 mb-0 text-small text-n-600">{t('setup.phone.nameHint', { brand })}</p>
            {/* Enter in a field saves, as Continue does */}
            <button type="submit" hidden />
          </form>
        ) : (
          <>
            <div className="flex max-w-100 flex-col gap-6">
              <SignInForm signIn={signIn} labelledBy={titleId} />
            </div>
            {!onCode && (
              <>
                <div className="h-px bg-n-200" />
                <p className="m-0 text-body text-n-600">
                  {t.rich('setup.phone.login', {
                    login: (chunks) => (
                      <Link to="/login" className={textLink}>
                        {chunks}
                      </Link>
                    ),
                  })}
                </p>
              </>
            )}
          </>
        )}
      </section>
    </SetupFrame>
  )
}

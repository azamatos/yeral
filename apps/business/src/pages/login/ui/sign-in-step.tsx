import { Link } from '@tanstack/react-router'
import type { useSignIn } from '@yeral/features/auth-by-phone'
import { useId } from 'react'
import { useTranslations } from 'use-intl'
import { CodeLead, SignInForm } from '@/features/sign-in'
import { AuthPage, textLink } from '@/shared/ui'

/** The phone step and the code step (B-Login `step` phone · code and their states), in the shared SignInCodeStep. */
export function SignInStep({ signIn }: { signIn: ReturnType<typeof useSignIn> }) {
  const t = useTranslations()
  const titleId = useId()
  const brand = t('common.brand')
  const onCode = signIn.state.step === 'code'

  return (
    <AuthPage
      titleId={titleId}
      title={onCode ? t('login.codeTitle') : t('login.title', { app: t('app.name', { brand }) })}
      lead={onCode ? <CodeLead signIn={signIn} /> : t('login.lead')}
    >
      <SignInForm signIn={signIn} labelledBy={titleId} />
      {!onCode && (
        <>
          <div className="h-px bg-n-200" />
          <p className="m-0 text-body text-n-600">
            {t.rich('login.noBusiness', {
              start: (chunks) => (
                <Link to="/setup/$step" params={{ step: 'phone' }} className={textLink}>
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </>
      )}
    </AuthPage>
  )
}

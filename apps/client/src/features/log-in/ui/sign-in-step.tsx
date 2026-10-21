import { formatPhone, toE164 } from '@yeral/domain/phone'
import type { useSignIn } from '@yeral/features/auth-by-phone'
import { cn } from '@yeral/ui/cn'
import { ModalDescription } from '@yeral/ui/modal'
import { textLink } from '@yeral/ui/text-link'
import { useTranslations } from 'use-intl'
import { CodeStep, DemoNote } from '@/shared/ui'
import { LoginHeader } from './login-header'

/**
 * The phone and the code (Auth «1 · Telefon», «2 · SMS kod», «4 · Ýalňyş kod»; book C-19 steps 1, 2, 4) in the
 * site's code step, under the modal's header: «Log in to Ýeral», then «Enter the code» with the number and «Change
 * number».
 */
export function SignInStep({ signIn }: { signIn: ReturnType<typeof useSignIn> }) {
  const t = useTranslations()
  const { state } = signIn
  const onCode = state.step === 'code'

  return (
    <>
      <LoginHeader title={onCode ? t('login.codeTitle') : t('login.title', { brand: t('common.brand') })}>
        <ModalDescription className="[&_b]:font-semibold [&_b]:text-n-900">
          {onCode ? (
            <>
              {t.rich('login.codeLead', {
                phone: formatPhone(toE164(state.sentTo ?? state.phone)),
                b: (chunks) => <b className="whitespace-nowrap tabular-nums">{chunks}</b>,
              })}{' '}
              <button type="button" onClick={signIn.changeNumber} className={cn(textLink, 'whitespace-nowrap')}>
                {t('login.changeNumber')}
              </button>
            </>
          ) : (
            t('login.lead')
          )}
        </ModalDescription>
      </LoginHeader>
      {!onCode && <DemoNote />}
      <CodeStep steps={signIn} />
    </>
  )
}

import { useMutation, useQuery } from '@tanstack/react-query'
import type { AdminBusiness } from '@yeral/contract/admin'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { toast } from '@yeral/ui/toast'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { businessState } from '@/entities/business'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { ReasonModal } from '@/shared/ui'

type Asking = 'reject' | 'hide' | 'close' | 'rejectName' | null

/**
 * What the team can do with a business in its state (book F-179, Q-012, Q-213, Q-215, Q-275). The api decides; a verdict
 * made by someone else meanwhile comes back as a toast and the page refreshes. Nothing is verified while the sign-in
 * code shows on the screen (Q-036), so the button says why instead of failing. A new name waiting is approved or turned
 * down with a reason; what a live business changed is marked checked; each names what the team looked at, so a newer
 * change isn't decided by mistake.
 */
export function BusinessActions({ business }: { business: AdminBusiness }) {
  const t = useTranslations('business')
  const sdk = useSdk()
  const errorText = useErrorText()
  const { id, name } = business
  const [asking, setAsking] = useState<Asking>(null)
  const state = businessState(business)
  const codeOnScreen = useQuery(sdk.auth.mode()).data?.codeOnScreen ?? false

  const failed = { onError: (error: unknown) => void toast.error(errorText(error)) }
  const done = (words: string) => ({
    ...failed,
    onSuccess: () => {
      toast(words)
      setAsking(null)
    },
  })
  const verify = useMutation(sdk.admin.verify(id))
  const reject = useMutation(sdk.admin.reject(id))
  const hide = useMutation(sdk.admin.hide(id))
  const show = useMutation(sdk.admin.show(id))
  const close = useMutation(sdk.admin.close(id))
  const reopen = useMutation(sdk.admin.reopen(id))
  const approveName = useMutation(sdk.admin.approveName(id))
  const rejectName = useMutation(sdk.admin.rejectName(id))

  if (state === 'draft') return <Callout tone="neutral">{t('draft')}</Callout>
  if (state === 'closed')
    return (
      <Button loading={reopen.isPending} onClick={() => reopen.mutate(undefined, done(t('reopened', { name })))}>
        {t('reopen')}
      </Button>
    )

  const undecided = business.verification !== 'verified'
  // what a live business changed; one in review is checked whole by Verify
  const recheck = undecided ? null : business.recheck
  const renamed = business.pendingName?.name
  return (
    <div className="flex flex-col gap-3">
      {undecided && (
        <>
          {codeOnScreen && <Callout tone="neutral">{t('noVerify')}</Callout>}
          <Button
            variant="primary"
            disabled={codeOnScreen}
            loading={verify.isPending}
            onClick={() => verify.mutate(undefined, done(t('verified', { name })))}
          >
            {t('verify')}
          </Button>
        </>
      )}
      {renamed && (
        <>
          <Button
            variant="primary"
            loading={approveName.isPending}
            onClick={() => approveName.mutate({ name: renamed }, done(t('nameApproved', { name: renamed })))}
          >
            {t('approveName')}
          </Button>
          <Button onClick={() => setAsking('rejectName')}>{t('rejectName')}</Button>
        </>
      )}
      {recheck && (
        <Button variant="primary" loading={verify.isPending} onClick={() => verify.mutate(recheck.at, done(t('rechecked', { name })))}>
          {t('recheck')}
        </Button>
      )}
      {business.verification !== 'rejected' && <Button onClick={() => setAsking('reject')}>{t('reject')}</Button>}
      {business.hidden ? (
        <Button loading={show.isPending} onClick={() => show.mutate(undefined, done(t('shown', { name })))}>
          {t('show')}
        </Button>
      ) : (
        <Button onClick={() => setAsking('hide')}>{t('hide')}</Button>
      )}
      <Button variant="tertiary" onClick={() => setAsking('close')}>
        {t('close')}
      </Button>

      {asking === 'reject' && (
        <ReasonModal
          title={t('rejectTitle', { name })}
          lead={t(undecided ? 'rejectLead' : 'rejectLiveLead')}
          hint={t('reasonHint')}
          action={t('reject')}
          pending={reject.isPending}
          onConfirm={(reason) => reject.mutate({ reason }, done(t('rejected', { name })))}
          onClose={() => setAsking(null)}
        />
      )}
      {asking === 'rejectName' && renamed && (
        <ReasonModal
          title={t('rejectNameTitle', { name: renamed })}
          lead={t('rejectNameLead', { current: name })}
          hint={t('reasonHint')}
          action={t('rejectName')}
          pending={rejectName.isPending}
          onConfirm={(reason) => rejectName.mutate({ name: renamed, reason }, done(t('nameRejected', { name: renamed })))}
          onClose={() => setAsking(null)}
        />
      )}
      {asking === 'hide' && (
        <ReasonModal
          title={t('hideTitle', { name })}
          lead={t('hideLead')}
          hint={t('reasonHint')}
          action={t('hide')}
          pending={hide.isPending}
          onConfirm={(reason) => hide.mutate({ reason }, done(t('hidden', { name })))}
          onClose={() => setAsking(null)}
        />
      )}
      {asking === 'close' && (
        <ReasonModal
          title={t('closeTitle', { name })}
          lead={t('closeLead')}
          hint={t('reasonHint')}
          action={t('close')}
          pending={close.isPending}
          onConfirm={(reason) =>
            close.mutate(
              { reason },
              {
                ...failed,
                onSuccess: ({ cancelled }) => {
                  toast(t('closed', { name, cancelled }))
                  setAsking(null)
                },
              },
            )
          }
          onClose={() => setAsking(null)}
        />
      )}
    </div>
  )
}

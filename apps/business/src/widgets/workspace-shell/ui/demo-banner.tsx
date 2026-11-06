import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'

/**
 * «This is a demo workspace» over the page (B-Shell `banner: demo`, book F-242). «Create your business» leaves the demo
 * first: its account can't start a business, and someone's own session comes back with it gone.
 */
export function DemoBanner() {
  const t = useTranslations('shell.demo')
  const all = useTranslations()
  const sdk = useSdk()
  const navigate = useNavigate()
  const leave = useMutation(sdk.auth.logout())
  const create = () => leave.mutate(undefined, { onSuccess: () => void navigate({ to: '/setup/$step', params: { step: 'phone' } }) })
  return (
    <Callout
      tone="accent"
      className="m-3"
      action={
        <Button size="s" loading={leave.isPending} onClick={create}>
          {t('create')}
        </Button>
      }
    >
      {t('text', { brand: all('common.brand') })}
    </Callout>
  )
}

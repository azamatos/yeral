import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { LocateFixed, MapPinOff } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { LocationHelp } from './location-help'

/**
 * The offer to use the client's location (book C-01, States 02), and, once the browser said no, the line saying the list is
 * by city (States 03) with a short help sheet. Nothing asks until a button is pressed.
 */
export function LocationBanner({
  unknown,
  denied,
  locating,
  onAllow,
  onType,
  className,
}: {
  unknown: boolean
  denied: boolean
  locating: boolean
  onAllow: () => void
  onType: () => void
  className?: string
}) {
  const t = useTranslations('location')
  const [help, setHelp] = useState(false)
  if (denied)
    return (
      <>
        <Callout
          tone="neutral"
          size="s"
          icon={<MapPinOff aria-hidden />}
          className={className}
          action={
            <Button variant="secondary" size="s" onClick={() => setHelp(true)}>
              {t('openSettings')}
            </Button>
          }
        >
          {t('off')}
        </Callout>
        <LocationHelp open={help} onOpenChange={setHelp} />
      </>
    )
  if (!unknown) return null
  return (
    <Callout
      tone="neutral"
      size="s"
      icon={<LocateFixed aria-hidden />}
      title={t('title')}
      className={className}
      actions={
        <>
          <Button variant="primary" size="s" loading={locating} loadingLabel={t('locating')} onClick={onAllow}>
            {t('allow')}
          </Button>
          <Button variant="secondary" size="s" onClick={onType}>
            {t('type')}
          </Button>
        </>
      }
    >
      {t('why')}
    </Callout>
  )
}

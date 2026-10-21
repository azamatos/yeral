import { brand } from '@yeral/ui/brand'
import { ModalHeader } from '@yeral/ui/modal'
import type { ReactNode } from 'react'
import { useTranslations } from 'use-intl'

/** The login modal's top (Auth `.mtop`): the brand icon 40 and the close button, then the step's title and lead. */
export function LoginHeader({ title, children }: { title: ReactNode; children?: ReactNode }) {
  const t = useTranslations('login')
  return (
    <ModalHeader
      media={<img src={brand.icon} alt="" width={40} height={40} className="block size-10 rounded-s" />}
      title={title}
      closeLabel={t('close')}
    >
      {children}
    </ModalHeader>
  )
}

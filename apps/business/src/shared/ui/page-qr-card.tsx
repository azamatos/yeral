import { QrBlock } from '@yeral/ui/qr-block'
import { useTranslations } from 'use-intl'
import { pageLink } from '../config'

/**
 * A business's QR card (B-Settings Link and QR; the setup's last step since 25.10.2026): the code at 200 with the
 * business name, its link, «Put it by the till…», Download PNG / Download SVG and «PNG for printing, SVG for designers.».
 * The code opens the page link; the files are named after the business.
 */
export function PageQrCard({ slug, name }: { slug: string; name: string }) {
  const t = useTranslations('pageLink')
  const link = pageLink(slug)
  return (
    <QrBlock
      value={link.url}
      label={t('qrLabel', { name })}
      fileName={`${slug}-qr`}
      title={name}
      link={link.display}
      description={t('qrNote')}
      caption={t('qrCaption')}
      copy={{
        downloadPng: t('downloadPng'),
        downloadSvg: t('downloadSvg'),
        downloaded: (format) => t('downloaded', { format }),
      }}
    />
  )
}

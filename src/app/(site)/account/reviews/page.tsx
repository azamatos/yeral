'use client'

import { MessageSquareText } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { useMyReviews, useReviewAction } from '@/api/hooks'
import { useFmt } from '@/lib/format'
import { Empty, Skeleton, Stars } from '@/components/ui/bits'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'

export default function MyReviewsPage() {
  const t = useTranslations('account')
  const tc = useTranslations('common')
  const f = useFmt()
  const { data } = useMyReviews()
  const act = useReviewAction()
  const [edit, setEdit] = useState<{ id: string; rating: number; text: string } | null>(null)
  const [del, setDel] = useState<string | null>(null)
  return (
    <>
      <h1 className="text-[28px] font-bold tracking-[-0.03em] md:text-[34px]">{t('reviews')}</h1>
      <div className="mt-6 flex max-w-[760px] flex-col gap-3">
        {!data && <Skeleton className="h-32 rounded-card" />}
        {data?.map((r) => (
          <article key={r.id} className="rounded-card border border-line p-4 md:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link href={`/${r.salonSlug}`} className="font-semibold hover:underline">{r.salonName}</Link>
                <div className="text-[13px] text-ink-3">{f.dayMonth(r.date)} · {r.svc}{r.staffName ? ` · ${r.staffName}` : ''}</div>
              </div>
              <Stars n={r.rating} size={14} />
            </div>
            <p className="mt-3 text-[15px] leading-relaxed">{r.text}</p>
            {r.answer && <div className="mt-3 rounded-xl bg-acc-tint px-4 py-3 text-[14px] text-acc-ink">{r.answer.text}</div>}
            <div className="mt-3 flex gap-2">
              <Button size="xs" variant="outline" onClick={() => setEdit({ id: r.id, rating: r.rating, text: r.text })}>{t('edit')}</Button>
              <Button size="xs" variant="ghost" className="text-red-ink" onClick={() => setDel(r.id)}>{t('delete')}</Button>
            </div>
          </article>
        ))}
        {data && !data.length && <Empty icon={<MessageSquareText size={28} />} title={t('reviews')} text={t('emptyReviews')} />}
      </div>
      <Dialog
        open={!!edit}
        onOpenChange={(v) => !v && setEdit(null)}
        title={t('edit')}
        footer={<Button block disabled={!edit || edit.text.trim().length < 3} onClick={() => edit && act.mutate({ kind: 'update', ...edit }, { onSuccess: () => setEdit(null) })}>{tc('save')}</Button>}
      >
        {edit && (
          <>
            <Stars n={edit.rating} size={28} onPick={(n) => setEdit({ ...edit, rating: n })} className="-ml-1" />
            <textarea value={edit.text} onChange={(e) => setEdit({ ...edit, text: e.target.value })} rows={4} className="mt-3 w-full resize-none rounded-input border border-line-2 px-4 py-3 text-[15px] outline-none focus:border-acc" />
          </>
        )}
      </Dialog>
      <Dialog
        open={!!del}
        onOpenChange={(v) => !v && setDel(null)}
        title={t('deleteReviewConfirm')}
        size="sm"
        footer={
          <>
            <Button variant="dangerSolid" block onClick={() => del && act.mutate({ kind: 'remove', id: del }, { onSuccess: () => setDel(null) })}>{t('delete')}</Button>
            <Button variant="ghost" block onClick={() => setDel(null)}>{tc('cancel')}</Button>
          </>
        }
      />
    </>
  )
}

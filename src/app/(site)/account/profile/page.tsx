'use client'

import { LogOut, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { isMock } from '@/api'
import { useAuthActions, useSession } from '@/api/hooks'
import { resetDemo } from '@/api/mock/db'
import { Toggle } from '@/components/ui/bits'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'

export default function ProfilePage() {
  const t = useTranslations('account')
  const tc = useTranslations('common')
  const router = useRouter()
  const toast = useToast()
  const { data: session } = useSession()
  const { updateMe, logout } = useAuthActions()
  const [name, setName] = useState(session?.user.name ?? '')
  const [reset, setReset] = useState(false)
  if (!session) return null
  const u = session.user
  const row = 'flex items-center gap-4 border-b border-row px-4 py-3.5 last:border-0'
  return (
    <div className="max-w-[640px]">
      <h1 className="text-[28px] font-bold tracking-[-0.03em] md:text-[34px]">{t('profile')}</h1>

      <h2 className="mb-2 mt-8 text-[13px] font-semibold uppercase tracking-[0.07em] text-ink-3">{t('personal')}</h2>
      <div className="rounded-card border border-line">
        <form className={row} onSubmit={(e) => { e.preventDefault(); updateMe({ name: name.trim() }).then(() => toast(t('saved'))) }}>
          <label htmlFor="pname" className="w-28 flex-none text-[15px]">{t('name')}</label>
          <input id="pname" value={name} onChange={(e) => setName(e.target.value)} className="min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
          {name.trim() && name.trim() !== u.name && <Button size="xs" type="submit">{tc('save')}</Button>}
        </form>
        <div className={row}>
          <span className="w-28 flex-none text-[15px]">{t('phone')}</span>
          <span className="flex-1 text-[15px] text-ink-2 tabular">{u.phone}</span>
        </div>
      </div>

      <h2 className="mb-2 mt-8 text-[13px] font-semibold uppercase tracking-[0.07em] text-ink-3">{t('notifications')}</h2>
      <div className="rounded-card border border-line">
        {([
          ['push', t('notifPush'), t('notifPushSub')],
          ['smsStatus', t('notifSmsStatus'), t('notifSmsStatusSub')],
          ['smsReminder', t('notifSmsReminder'), t('notifSmsReminderSub')],
        ] as const).map(([k, title, sub]) => (
          <div key={k} className={row}>
            <div className="flex-1">
              <div className="text-[15px]">{title}</div>
              <div className="text-[13px] text-ink-2">{sub}</div>
            </div>
            <Toggle label={title} on={u.notif[k]} onChange={(v) => updateMe({ notif: { ...u.notif, [k]: v } })} />
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <Button variant="outline" icon={<LogOut size={16} strokeWidth={1.75} />} onClick={async () => { await logout(); router.push('/') }}>{t('logout')}</Button>
        {isMock && <Button variant="ghost" icon={<RotateCcw size={16} strokeWidth={1.75} />} onClick={() => setReset(true)}>{t('demoReset')}</Button>}
      </div>
      <Dialog
        open={reset}
        onOpenChange={setReset}
        title={t('demoReset')}
        description={t('demoResetConfirm')}
        size="sm"
        footer={
          <>
            <Button variant="dangerSolid" block onClick={() => { resetDemo(); setReset(false); toast(t('demoResetDone')); router.push('/') }}>{t('demoReset')}</Button>
            <Button variant="ghost" block onClick={() => setReset(false)}>{tc('cancel')}</Button>
          </>
        }
      />
    </div>
  )
}

'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'
import { useAuthActions } from '@/api/hooks'
import { DEMO_PHONE } from '@/api/mock/db'
import { isMock } from '@/api'
import { cls, fmtPhone, normPhone } from '@/domain/time'
import { Note } from '@/components/ui/bits'
import { Button } from '@/components/ui/button'

/**
 * Phone + SMS code. The common login in Turkmenistan is the phone number, not e-mail.
 * New users give a name right after the code (the salon sees it on the booking).
 */
export function PhoneAuth({ onDone, compact }: { onDone: (isNew: boolean) => void; compact?: boolean }) {
  const t = useTranslations('auth')
  const { requestCode, verify, updateMe } = useAuthActions()
  const [step, setStep] = useState<'phone' | 'code' | 'name'>('phone')
  const [phone, setPhone] = useState('+993 ')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [demoCode, setDemoCode] = useState<string>()
  const [err, setErr] = useState(false)
  const [busy, setBusy] = useState(false)
  const codeRef = useRef<HTMLInputElement>(null)
  const valid = normPhone(phone).length === 11

  useEffect(() => {
    if (step === 'code') codeRef.current?.focus()
  }, [step])

  const send = async () => {
    setBusy(true)
    const r = await requestCode(phone)
    setDemoCode(r.demoCode)
    setBusy(false)
    setStep('code')
  }
  const check = async (c = code) => {
    setBusy(true)
    const r = await verify(phone, c)
    setBusy(false)
    if (!r.ok) {
      setErr(true)
      setCode('')
      return
    }
    if (r.isNew) setStep('name')
    else onDone(false)
  }

  const input = 'h-[52px] w-full rounded-input border border-line-2 bg-white px-4 text-[17px] outline-none transition-shadow focus:border-acc focus:shadow-[0_0_0_3px_rgb(90_63_240/0.12)]'

  if (step === 'name')
    return (
      <form className="flex flex-col gap-3" onSubmit={async (e) => { e.preventDefault(); setBusy(true); await updateMe({ name: name.trim() }); onDone(true) }}>
        <label className="text-[14px] font-medium text-ink-2" htmlFor="auth-name">{t('name')}</label>
        <input id="auth-name" autoFocus className={input} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('namePlaceholder')} autoComplete="name" />
        <div className="text-[13px] text-ink-3">{t('nameHint')}</div>
        <Button type="submit" size="lg" block disabled={name.trim().length < 2 || busy}>{t('verify')}</Button>
      </form>
    )

  if (step === 'code')
    return (
      <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); check() }}>
        <div className="text-[14px] text-ink-2">{t('codeSent', { phone })}</div>
        <input
          ref={codeRef}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={4}
          className={cls(input, 'text-center text-[24px] font-semibold tracking-[0.5em] tabular', err && 'border-red')}
          value={code}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 4)
            setCode(v)
            setErr(false)
            if (v.length === 4) check(v)
          }}
          placeholder="• • • •"
          aria-label={t('code')}
        />
        {err && <div className="text-[13.5px] text-red-ink">{t('wrongCode')}</div>}
        {isMock && demoCode && <Note tone="acc">{t('demoCode', { code: demoCode })}</Note>}
        <Button type="submit" size="lg" block disabled={code.length !== 4 || busy}>{t('verify')}</Button>
        <div className="flex justify-between text-[13.5px]">
          <button type="button" className="font-medium text-ink-2 hover:text-ink" onClick={() => { setStep('phone'); setCode('') }}>{t('changePhone')}</button>
          <button type="button" className="font-medium text-acc-ink hover:underline" onClick={send}>{t('resend')}</button>
        </div>
      </form>
    )

  return (
    <form className="flex flex-col gap-3" onSubmit={(e) => { e.preventDefault(); if (valid) send() }}>
      {!compact && <label className="text-[14px] font-medium text-ink-2" htmlFor="auth-phone">{t('phone')}</label>}
      <input
        id="auth-phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        className={cls(input, 'tabular')}
        value={phone}
        onChange={(e) => setPhone(fmtPhone(e.target.value))}
        aria-label={t('phone')}
      />
      <Button type="submit" size="lg" block disabled={!valid || busy}>{t('getCode')}</Button>
      {isMock && (
        <button type="button" className="text-left text-[13px] text-ink-3 hover:text-ink" onClick={() => setPhone(DEMO_PHONE)}>
          {t('demoHint', { phone: DEMO_PHONE })}
        </button>
      )}
      {!compact && <div className="text-[12.5px] leading-snug text-ink-3">{t('terms')}</div>}
    </form>
  )
}

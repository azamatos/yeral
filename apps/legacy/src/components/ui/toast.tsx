'use client'

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

type Toast = { id: number; text: string; action?: { label: string; run: () => void } }
const Ctx = createContext<(text: string, action?: Toast['action']) => void>(() => {})
export const useToast = () => useContext(Ctx)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const show = useCallback((text: string, action?: Toast['action']) => {
    window.clearTimeout(timer.current)
    setToast({ id: Date.now(), text, action })
    timer.current = window.setTimeout(() => setToast(null), 3400)
  }, [])
  return (
    <Ctx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+84px)] z-[100] flex justify-center px-4 md:bottom-8">
        {toast && (
          <div key={toast.id} className="pointer-events-auto flex max-w-md animate-pop-in items-center gap-4 rounded-[14px] bg-ink px-4 py-3 text-[14px] text-white shadow-pop">
            <span>{toast.text}</span>
            {toast.action && (
              <button className="ml-auto font-semibold text-acc-200" onClick={() => { toast.action!.run(); setToast(null) }}>
                {toast.action.label}
              </button>
            )}
          </div>
        )}
      </div>
    </Ctx.Provider>
  )
}

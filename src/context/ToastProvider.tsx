"use client"

import { createContext, useCallback, useContext, useState, ReactNode } from "react"
import { CheckCircle2, XCircle, ShieldCheck, Info, X } from "lucide-react"

type ToastType = "success" | "error" | "warn" | "info"
type Toast = { id: number; message: string; type: ToastType }

const ToastCtx = createContext<{ notify: (message: string, type?: ToastType) => void } | null>(null)

const CFG: Record<ToastType, { Icon: typeof Info; color: string }> = {
  success: { Icon: CheckCircle2, color: "#EAE1CE" },
  error: { Icon: XCircle, color: "#FF6B6B" },
  warn: { Icon: ShieldCheck, color: "#F5B759" },
  info: { Icon: Info, color: "#B2A693" },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const notify = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message, type }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4500)
  }, [])

  return (
    <ToastCtx.Provider value={{ notify }}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[22rem] max-w-[90vw] flex-col gap-2">
        {toasts.map((t) => {
          const { Icon, color } = CFG[t.type]
          return (
            <div key={t.id} className="pointer-events-auto flex items-start gap-3 rounded-xl border border-[#2A2119] bg-[#16120D] p-3.5 shadow-lg shadow-black/40">
              <span className="mt-0.5 shrink-0" style={{ color }}><Icon className="h-4 w-4" /></span>
              <p className="flex-1 text-sm leading-snug text-[#F1EADD]">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="shrink-0 text-[#847668] transition-colors hover:text-[#F1EADD]"><X className="h-4 w-4" /></button>
            </div>
          )
        })}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const c = useContext(ToastCtx)
  if (!c) throw new Error("useToast must be used within ToastProvider")
  return c
}

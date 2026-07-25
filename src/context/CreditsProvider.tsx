"use client"

import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from "react"
import { useAuth } from "@/context/AuthProvider"

type CreditsCtx = {
  balance: number
  loading: boolean
  ready: boolean
  refresh: () => Promise<void>
  spend: (amount: number) => Promise<boolean>
  earn: (amount: number) => Promise<void>
  topup: (txHash: string) => Promise<{ ok: boolean; credited?: number; error?: string }>
}

const Ctx = createContext<CreditsCtx | null>(null)

export function CreditsProvider({ children }: { children: ReactNode }) {
  const { identity } = useAuth()
  const userKey = identity?.handle ?? null
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!userKey) { setBalance(0); return }
    setLoading(true)
    try {
      const r = await fetch(`/api/credits?user=${encodeURIComponent(userKey)}`)
      const d = await r.json()
      if (typeof d.balance === "number") setBalance(d.balance)
    } catch {} finally { setLoading(false) }
  }, [userKey])

  useEffect(() => { refresh() }, [refresh])

  const spend = useCallback(async (amount: number): Promise<boolean> => {
    if (!userKey) return false
    try {
      const r = await fetch("/api/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: userKey, delta: -Math.abs(amount) }),
      })
      const d = await r.json()
      if (!r.ok || d.error) return false
      if (typeof d.balance === "number") setBalance(d.balance)
      return true
    } catch { return false }
  }, [userKey])

  const earn = useCallback(async (amount: number): Promise<void> => {
    if (!userKey) return
    try {
      const r = await fetch("/api/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: userKey, delta: Math.abs(amount) }),
      })
      const d = await r.json()
      if (typeof d.balance === "number") setBalance(d.balance)
    } catch {}
  }, [userKey])

  const topup = useCallback(async (txHash: string): Promise<{ ok: boolean; credited?: number; error?: string }> => {
    if (!userKey) return { ok: false, error: "Login dulu." }
    try {
      const r = await fetch("/api/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: userKey, txHash }),
      })
      const d = await r.json()
      if (!r.ok || d.error) return { ok: false, error: d.error || "Gagal top up." }
      if (typeof d.balance === "number") setBalance(d.balance)
      return { ok: true, credited: d.credited }
    } catch (e: any) { return { ok: false, error: e?.message || "Network error." } }
  }, [userKey])

  return (
    <Ctx.Provider value={{ balance, loading, ready: !!userKey, refresh, spend, earn, topup }}>
      {children}
    </Ctx.Provider>
  )
}

export function useCredits() {
  const c = useContext(Ctx)
  if (!c) throw new Error("useCredits must be used within CreditsProvider")
  return c
}

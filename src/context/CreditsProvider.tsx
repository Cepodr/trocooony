"use client"

import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from "react"
import { useAuth } from "@/context/AuthProvider"

type CreditsCtx = {
  rlo: number
  trlo: number
  balance: number
  loading: boolean
  ready: boolean
  refresh: () => Promise<void>
  deposit: (amount: number) => Promise<{ ok: boolean; error?: string }>
  withdraw: (amount: number) => Promise<{ ok: boolean; error?: string }>
  spendTrlo: (amount: number) => Promise<boolean>
  earnTrlo: (amount: number) => Promise<void>
  spend: (amount: number) => Promise<boolean>
  earn: (amount: number) => Promise<void>
  topup: (txHash: string) => Promise<{ ok: boolean; credited?: number; error?: string }>
}

const Ctx = createContext<CreditsCtx | null>(null)

export function CreditsProvider({ children }: { children: ReactNode }) {
  const { identity } = useAuth()
  const userKey = identity?.handle ?? null
  const [rlo, setRlo] = useState(0)
  const [trlo, setTrlo] = useState(0)
  const [loading, setLoading] = useState(false)

  const apply = useCallback((d: any) => {
    if (typeof d?.rlo === "number") setRlo(d.rlo)
    if (typeof d?.trlo === "number") setTrlo(d.trlo)
  }, [])

  const refresh = useCallback(async () => {
    if (!userKey) { setRlo(0); setTrlo(0); return }
    setLoading(true)
    try {
      const r = await fetch(`/api/credits?user=${encodeURIComponent(userKey)}`)
      apply(await r.json())
    } catch {} finally { setLoading(false) }
  }, [userKey, apply])

  useEffect(() => { refresh() }, [refresh])

  const act = useCallback(async (action: string, amount: number): Promise<{ ok: boolean; error?: string }> => {
    if (!userKey) return { ok: false, error: "Login dulu." }
    try {
      const r = await fetch("/api/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user: userKey, action, amount: Math.abs(amount) }),
      })
      const d = await r.json()
      if (!r.ok || d.error) return { ok: false, error: d.error || "Gagal." }
      apply(d)
      return { ok: true }
    } catch (e: any) { return { ok: false, error: e?.message || "Network error." } }
  }, [userKey, apply])

  const deposit = useCallback((amount: number) => act("deposit", amount), [act])
  const withdraw = useCallback((amount: number) => act("withdraw", amount), [act])
  const spendTrlo = useCallback(async (amount: number): Promise<boolean> => (await act("spend", amount)).ok, [act])
  const earnTrlo = useCallback(async (amount: number): Promise<void> => { await act("earn", amount) }, [act])

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
      if (typeof d.balance === "number") setRlo(d.balance)
      if (typeof d.trlo === "number") setTrlo(d.trlo)
      return { ok: true, credited: d.credited }
    } catch (e: any) { return { ok: false, error: e?.message || "Network error." } }
  }, [userKey])

  return (
    <Ctx.Provider value={{ rlo, trlo, balance: rlo, loading, ready: !!userKey, refresh, deposit, withdraw, spendTrlo, earnTrlo, spend: spendTrlo, earn: earnTrlo, topup }}>
      {children}
    </Ctx.Provider>
  )
}

export function useCredits() {
  const c = useContext(Ctx)
  if (!c) throw new Error("useCredits must be used within CreditsProvider")
  return c
}

"use client"

import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react"
import { AGENTS } from "@/lib/agents"

export type Outcome = {
  agentId: string
  agentName: string
  result: "PASS" | "FAIL" | "REFUND"
  score: number | null
  reward: number
  ts: number
}

export type AgentRep = {
  id: string; agentId: string; name: string; agentName: string; specialty: string; official: boolean
  tasks: number; passes: number; fails: number; refunds: number
  avgScore: number; rloEarned: number; passRate: number; reputation: number
}

type Ctx = {
  outcomes: Outcome[]
  agents: AgentRep[]
  recordOutcome: (o: Omit<Outcome, "ts">) => void
}

const RepCtx = createContext<Ctx | null>(null)
const KEY = "rialo_reputation"

export function ReputationProvider({ children }: { children: ReactNode }) {
  const [outcomes, setOutcomes] = useState<Outcome[]>([])

  // Muat dari Supabase (via API). Fallback ke cache localStorage kalau offline.
  // The first request after a cold start can fail while the database wakes
  // up. A visitor arriving then has no cache to fall back on, so retry
  // briefly before giving up and showing an empty reputation table.
  useEffect(() => {
    let alive = true
    const load = async (attempt = 0): Promise<void> => {
      try {
        const res = await fetch("/api/reputation")
        const d = await res.json()
        if (!alive) return
        if (!res.ok || !Array.isArray(d.outcomes)) throw new Error("bad response")
        setOutcomes(d.outcomes as Outcome[])
        try { localStorage.setItem(KEY, JSON.stringify(d.outcomes)) } catch {}
      } catch {
        if (!alive) return
        if (attempt < 2) {
          setTimeout(() => { void load(attempt + 1) }, 800 * (attempt + 1))
          return
        }
        try { const cached = localStorage.getItem(KEY); if (cached) setOutcomes(JSON.parse(cached)) } catch {}
      }
    }
    void load()
    return () => { alive = false }
  }, [])

  const recordOutcome = (o: Omit<Outcome, "ts">) => {
    setOutcomes((prev) => {
      const next = [{ ...o, ts: Date.now() }, ...prev]
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch {}
      return next
    })
    fetch("/api/reputation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(o),
    }).catch(() => {})
  }

  
  const agents = useMemo<AgentRep[]>(() => {
    const meta: { id: string; name: string; specialty: string; official: boolean }[] = AGENTS.map((a) => ({ id: a.id, name: a.name, specialty: a.specialty, official: true }))
    for (const o of outcomes) {
      if (!meta.some((m) => m.id === o.agentId)) {
        meta.push({ id: o.agentId, name: o.agentName || "Community agent", specialty: "Community agent", official: false })
      }
    }
    const list = meta.map((a) => {
      const os = outcomes.filter((o) => o.agentId === a.id)
      const tasks = os.length
      const passes = os.filter((o) => o.result === "PASS").length
      const fails = os.filter((o) => o.result === "FAIL").length
      const refunds = os.filter((o) => o.result === "REFUND").length
      const scored = os.filter((o) => o.score != null)
      const avgScore = scored.length ? Math.round(scored.reduce((s, o) => s + (o.score || 0), 0) / scored.length) : 0
      const rloEarned = os.filter((o) => o.result === "PASS").reduce((s, o) => s + o.reward, 0)
      const passRate = tasks ? Math.round((passes / tasks) * 100) : 0
      const reputation = tasks ? Math.round(0.5 * passRate + 0.5 * avgScore) : 0
      return { id: a.id, agentId: a.id, name: a.name, agentName: a.name, specialty: a.specialty, official: a.official, tasks, passes, fails, refunds, avgScore, rloEarned, passRate, reputation }
    })
    return list.sort((a, b) => b.reputation - a.reputation || b.rloEarned - a.rloEarned)
  }, [outcomes])

  return <RepCtx.Provider value={{ outcomes, agents, recordOutcome }}>{children}</RepCtx.Provider>
}

export function useReputation() {
  const c = useContext(RepCtx)
  if (!c) throw new Error("useReputation must be used within ReputationProvider")
  return c
}

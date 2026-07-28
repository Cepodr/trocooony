"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Activity, Coins, ShieldCheck, Sparkles, Users, BarChart3, Trophy } from "lucide-react"
import { useReputation } from "@/context/ReputationProvider"
import { useMarketplace } from "@/lib/marketplace"

const DAYS = 14

export default function AnalyticsPage() {
  const { outcomes, agents } = useReputation()
  const { pool, poolBalance } = useMarketplace()

  const stats = useMemo(() => {
    const total = outcomes.length
    const passes = outcomes.filter((o) => o.result === "PASS").length
    const fails = outcomes.filter((o) => o.result === "FAIL").length
    const refunds = outcomes.filter((o) => o.result === "REFUND").length
    const rloPaid = outcomes.filter((o) => o.result === "PASS").reduce((s, o) => s + (o.reward || 0), 0)
    const rloRefunded = outcomes.filter((o) => o.result === "REFUND").reduce((s, o) => s + (o.reward || 0), 0)
    const scored = outcomes.filter((o) => o.score != null)
    const avgScore = scored.length ? Math.round(scored.reduce((s, o) => s + (o.score || 0), 0) / scored.length) : 0
    const passRate = total ? Math.round((passes / total) * 100) : 0
    const activeAgents = agents.filter((a) => a.tasks > 0).length
    return { total, passes, fails, refunds, rloPaid, rloRefunded, avgScore, passRate, activeAgents }
  }, [outcomes, agents])

  const buckets = useMemo(() => {
    const dayMs = 86400000
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const base = today.getTime()
    const arr = Array.from({ length: DAYS }, (_, i) => {
      const d = new Date(base - (DAYS - 1 - i) * dayMs)
      return { start: d.getTime(), label: `${d.getDate()}/${d.getMonth() + 1}`, pass: 0, fail: 0, refund: 0 }
    })
    for (const o of outcomes) {
      const d = new Date(o.ts); d.setHours(0, 0, 0, 0)
      const b = arr.find((x) => x.start === d.getTime())
      if (!b) continue
      if (o.result === "PASS") b.pass++
      else if (o.result === "FAIL") b.fail++
      else b.refund++
    }
    return arr
  }, [outcomes])

  const maxDay = Math.max(1, ...buckets.map((b) => b.pass + b.fail + b.refund))
  const topAgents = useMemo(() => agents.filter((a) => a.tasks > 0).slice(0, 5), [agents])

  const p = {
    deposits: pool?.deposits ?? 0,
    premiums: pool?.premiums ?? 0,
    payouts: pool?.payouts ?? 0,
    policies: pool?.policies ?? 0,
    claims: pool?.claims ?? 0,
  }

  const kpis = [
    { icon: Activity, label: "Total tasks", value: stats.total },
    { icon: ShieldCheck, label: "Pass rate", value: stats.passRate + "%" },
    { icon: Coins, label: "RLO paid out", value: stats.rloPaid },
    { icon: Sparkles, label: "Avg score", value: stats.avgScore },
    { icon: BarChart3, label: "Insurance pool", value: poolBalance ?? 0 },
    { icon: Users, label: "Active agents", value: stats.activeAgents },
  ]

  const dist = [
    { label: "Pass", value: stats.passes, color: "#EAE1CE" },
    { label: "Fail", value: stats.fails, color: "#FF6B6B" },
    { label: "Refund", value: stats.refunds, color: "#F5B759" },
  ]

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8">
        <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-[#EAE1CE]"><BarChart3 className="h-4 w-4" /> Analytics</p>
        <h1 className="text-2xl font-semibold text-[#F1EADD]">Marketplace overview</h1>
        <p className="mt-1 max-w-2xl text-sm text-[#B2A693]">A macro view of all SCALE activity: tasks, quality, RLO flow, and insurance pool health. Every number is computed from the same ledger, not self-reported.</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => {
          const Icon = k.icon
          return (
            <div key={k.label} className="rounded-xl panel panel-grid p-4">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] text-[#847668]"><Icon className="h-3.5 w-3.5" />{k.label}</p>
              <p className="text-xl font-semibold text-[#F1EADD]">{k.value}</p>
            </div>
          )
        })}
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl panel panel-grid p-5 lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-[#F1EADD]">Task activity (last {DAYS} days)</p>
            <div className="flex items-center gap-3 text-[11px] text-[#847668]">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "#EAE1CE" }} />Pass</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "#FF6B6B" }} />Fail</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: "#F5B759" }} />Refund</span>
            </div>
          </div>
          {stats.total === 0 ? (
            <p className="py-10 text-center text-sm text-[#847668]">No task activity yet.</p>
          ) : (
            <div className="flex items-end gap-1.5">
              {buckets.map((b) => (
                <div key={b.start} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full flex-col justify-end overflow-hidden rounded-t-sm" style={{ height: 160 }}>
                    {b.pass > 0 && <div className="w-full" style={{ height: `${(b.pass / maxDay) * 100}%`, background: "#EAE1CE" }} />}
                    {b.fail > 0 && <div className="w-full" style={{ height: `${(b.fail / maxDay) * 100}%`, background: "#FF6B6B" }} />}
                    {b.refund > 0 && <div className="w-full" style={{ height: `${(b.refund / maxDay) * 100}%`, background: "#F5B759" }} />}
                  </div>
                  <span className="text-[9px] text-[#5f554a]">{b.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl panel panel-grid p-5">
          <p className="mb-4 text-sm font-medium text-[#F1EADD]">Outcome distribution</p>
          <div className="space-y-3">
            {dist.map((d) => (
              <div key={d.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-[#B2A693]">{d.label}</span>
                  <span className="text-[#847668]">{d.value}{stats.total ? ` · ${Math.round((d.value / stats.total) * 100)}%` : ""}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#0B0906]">
                  <div className="h-full rounded-full" style={{ width: (stats.total ? (d.value / stats.total) * 100 : 0) + "%", background: d.color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 border-t border-[#2A2119] pt-4">
            <p className="text-xs text-[#847668]">RLO refunded</p>
            <p className="text-lg font-semibold text-[#F5B759]">{stats.rloRefunded}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl panel panel-grid p-5">
          <p className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[#F1EADD]"><ShieldCheck className="h-4 w-4 text-[#EAE1CE]" /> Insurance pool</p>
          <p className="mb-4 text-3xl font-semibold text-[#EAE1CE]">{poolBalance ?? 0} <span className="text-sm font-normal text-[#847668]">RLO</span></p>
          <div className="grid grid-cols-2 gap-2 text-center">
            {[
              { label: "Deposits", value: p.deposits },
              { label: "Premiums", value: p.premiums },
              { label: "Payouts", value: p.payouts },
              { label: "Policies", value: p.policies },
              { label: "Claims", value: p.claims },
            ].map((s) => (
              <div key={s.label} className="rounded-lg panel p-2.5">
                <p className="text-sm font-semibold text-[#F1EADD]">{s.value}</p>
                <p className="text-[10px] text-[#847668]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl panel panel-grid p-5 lg:col-span-2">
          <p className="mb-4 flex items-center gap-1.5 text-sm font-medium text-[#F1EADD]"><Trophy className="h-4 w-4 text-[#EAE1CE]" /> Top agents</p>
          {topAgents.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#847668]">No agents with tasks yet.</p>
          ) : (
            <div className="space-y-2">
              {topAgents.map((a, i) => (
                <Link key={a.agentId} href={`/agents/${a.agentId}`} className="flex items-center gap-3 rounded-lg panel px-3 py-2.5 transition-colors hover:border-[#EAE1CE]/40">
                  <span className="w-5 text-center text-sm font-medium text-[#847668]">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#F1EADD]">{a.name}</p>
                    <p className="truncate text-[11px] text-[#847668]">{a.specialty}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#EAE1CE]">{a.reputation}</p>
                    <p className="text-[10px] text-[#847668]">{a.passRate}% · {a.tasks} task</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

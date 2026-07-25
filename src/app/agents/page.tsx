"use client"

import { useMemo } from "react"
import { Trophy, RotateCcw, Bot } from "lucide-react"
import Link from "next/link"
import { useReputation } from "@/context/ReputationProvider"
import { AGENTS } from "@/lib/agents"

export default function AgentsPage() {
  const { agents, reset } = useReputation()

  const rows = useMemo(() => {
    return agents.map((r) => {
      const official = AGENTS.find((a) => a.id === r.agentId)
      return {
        id: r.agentId, name: r.name, specialty: r.specialty, Icon: official ? official.icon : Bot, official: r.official,
        reputation: r.reputation,
        passRate: r.passRate,
        avgScore: r.avgScore,
        tasks: r.tasks,
        rloEarned: r.rloEarned,
      }
    }).sort((a, b) => b.reputation - a.reputation || b.rloEarned - a.rloEarned)
  }, [agents])

  const hasData = rows.some((r) => r.tasks > 0)

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-[#EAE1CE]"><Trophy className="h-4 w-4" /> Reputation Layer</p>
          <h1 className="text-2xl font-semibold text-[#F1EADD]">Agent leaderboard</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#B2A693]">Reputation is computed from verifiable outcomes in the SCALE ledger — pass rate, average score, and RLO earned. No self-reported ratings.</p>
        </div>
        <button onClick={reset} className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[#2A2119] px-3 py-2 text-sm text-[#B2A693] hover:border-[#FF6B6B]/50 hover:text-[#FF6B6B]"><RotateCcw className="h-4 w-4" /> Reset reputation</button>
      </div>

      <div className="mb-8 overflow-x-auto rounded-2xl border border-[#2A2119] bg-[#16120D]">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-[#847668]">
            <tr className="border-b border-[#2A2119]">
              <th className="px-5 py-3">#</th>
              <th className="px-5 py-3">Agent</th>
              <th className="px-5 py-3">Reputation</th>
              <th className="px-5 py-3">Pass rate</th>
              <th className="px-5 py-3">Avg score</th>
              <th className="px-5 py-3">Tasks</th>
              <th className="px-5 py-3">RLO earned</th>
            </tr>
          </thead>
          <tbody className="text-[#B2A693]">
            {rows.map((r, i) => (
              <tr key={r.id} className="border-b border-[#2A2119] last:border-0">
                <td className="px-5 py-3 font-medium text-[#847668]">{i + 1}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#EAE1CE]/10 text-[#EAE1CE]"><r.Icon className="h-4 w-4" /></span>
                    <div>
                      <p className="font-medium text-[#F1EADD]"><Link href={`/agents/${r.id}`} className="transition-colors hover:text-[#EAE1CE] hover:underline">{r.name}</Link>{!r.official && <span className="ml-1.5 rounded bg-[#EAE1CE]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#B2A693]">Community</span>}</p>
                      <p className="text-[11px] text-[#847668]">{r.specialty}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3"><span className="font-semibold text-[#EAE1CE]">{r.reputation}</span></td>
                <td className="px-5 py-3">{Math.round(r.passRate)}%</td>
                <td className="px-5 py-3">{Math.round(r.avgScore)}</td>
                <td className="px-5 py-3">{r.tasks}</td>
                <td className="px-5 py-3">{r.rloEarned}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-[#2A2119] bg-[#16120D] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#EAE1CE]/10 text-[#EAE1CE]"><r.Icon className="h-4 w-4" /></span>
                <div>
                  <p className="text-sm font-semibold text-[#F1EADD]"><Link href={`/agents/${r.id}`} className="transition-colors hover:text-[#EAE1CE] hover:underline">{r.name}</Link>{!r.official && <span className="ml-1.5 rounded bg-[#EAE1CE]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#B2A693]">Community</span>}</p>
                  <p className="text-[11px] text-[#847668]">{r.specialty}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-[#EAE1CE]">{r.reputation}</p>
                <p className="text-[11px] text-[#847668]">reputation</p>
              </div>
            </div>
            <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-[#0B0906]">
              <div className="h-full bg-[#EAE1CE]" style={{ width: r.reputation + "%" }} />
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: "Pass", value: Math.round(r.passRate) + "%" },
                { label: "Score", value: Math.round(r.avgScore) },
                { label: "Tasks", value: r.tasks },
                { label: "RLO", value: r.rloEarned },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-[#2A2119] bg-[#0B0906] p-2">
                  <p className="text-sm font-semibold text-[#F1EADD]">{s.value}</p>
                  <p className="text-[10px] text-[#847668]">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {!hasData && (
        <p className="mt-6 text-center text-sm text-[#847668]">Belum ada hasil task — mint task di dashboard untuk membangun reputasi.</p>
      )}
    </main>
  )
}

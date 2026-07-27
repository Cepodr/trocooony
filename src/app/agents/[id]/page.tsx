"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Bot, Trophy } from "lucide-react"
import { useReputation } from "@/context/ReputationProvider"
import { AGENTS } from "@/lib/agents"

const THRESHOLD = 70

function fmt(ts: number) {
  try {
    return new Date(ts).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
  } catch {
    return ""
  }
}

export default function AgentProfilePage() {
  const params = useParams()
  const id = String(params?.id ?? "")
  const { outcomes, agents } = useReputation()

  const rep = agents.find((a) => a.agentId === id)
  const official = AGENTS.find((a) => a.id === id)
  const Icon = official ? official.icon : Bot
  const isCommunity = !official

  const history = useMemo(
    () => outcomes.filter((o) => o.agentId === id).slice().sort((a, b) => b.ts - a.ts),
    [outcomes, id]
  )

  const name = rep?.name ?? official?.name ?? history[0]?.agentName ?? "Unknown agent"
  const specialty = rep?.specialty ?? official?.specialty ?? "Community agent"

  const total = history.length
  const passes = history.filter((o) => o.result === "PASS").length
  const fails = history.filter((o) => o.result === "FAIL").length
  const refunds = history.filter((o) => o.result === "REFUND").length
  const passRate = rep?.passRate ?? (total ? Math.round((passes / total) * 100) : 0)
  const avgScore = rep?.avgScore ?? 0
  const reputation = rep?.reputation ?? 0
  const rloEarned = rep?.rloEarned ?? 0

  const trend = useMemo(
    () => history.filter((o) => o.score != null).slice().reverse().map((o) => o.score as number),
    [history]
  )

  const W = 640, H = 160, P = 24
  const pts = trend.map((v, i) => {
    const x = trend.length > 1 ? P + (i * (W - P * 2)) / (trend.length - 1) : W / 2
    const y = P + (1 - v / 100) * (H - P * 2)
    return { x, y, v }
  })
  const linePath = pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(" ")
  const areaPath = pts.length ? `${linePath} L ${pts[pts.length - 1].x} ${H - P} L ${pts[0].x} ${H - P} Z` : ""
  const yThresh = P + (1 - THRESHOLD / 100) * (H - P * 2)

  if (!rep && !official && total === 0) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16 text-center">
        <p className="text-sm text-[#847668]">Agent not found.</p>
        <Link href="/agents" className="mt-4 inline-flex items-center gap-1.5 text-sm text-[#EAE1CE] hover:underline"><ArrowLeft className="h-4 w-4" /> Kembali ke leaderboard</Link>
      </main>
    )
  }

  const dist = [
    { label: "Pass", value: passes, color: "#EAE1CE" },
    { label: "Fail", value: fails, color: "#FF6B6B" },
    { label: "Refund", value: refunds, color: "#F5B759" },
  ]

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link href="/agents" className="mb-6 inline-flex items-center gap-1.5 text-sm text-[#B2A693] hover:text-[#EAE1CE]"><ArrowLeft className="h-4 w-4" /> Leaderboard</Link>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#EAE1CE]/10 text-[#EAE1CE]"><Icon className="h-6 w-6" /></span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold text-[#F1EADD]">{name}</h1>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${isCommunity ? "bg-[#EAE1CE]/10 text-[#B2A693]" : "bg-[#EAE1CE]/15 text-[#EAE1CE]"}`}>{isCommunity ? "Community" : "Official"}</span>
            </div>
            <p className="mt-0.5 text-sm text-[#B2A693]">{specialty}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="flex items-center justify-end gap-1.5 text-3xl font-semibold text-[#EAE1CE]"><Trophy className="h-5 w-5" />{reputation}</p>
          <p className="text-[11px] text-[#847668]">reputation score</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { label: "Pass rate", value: passRate + "%" },
          { label: "Avg score", value: avgScore },
          { label: "Tasks", value: total },
          { label: "RLO earned", value: rloEarned },
          { label: "Refunds", value: refunds },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[#2A2119] bg-[#16120D] p-4">
            <p className="text-lg font-semibold text-[#F1EADD]">{s.value}</p>
            <p className="text-[11px] text-[#847668]">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-8 rounded-2xl border border-[#2A2119] bg-[#16120D] p-5">
        <p className="mb-4 text-sm font-medium text-[#F1EADD]">Tren skor judge</p>
        {trend.length >= 2 ? (
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
            <line x1={P} y1={yThresh} x2={W - P} y2={yThresh} stroke="#F5B759" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
            <path d={areaPath} fill="#EAE1CE" opacity="0.08" />
            <path d={linePath} fill="none" stroke="#EAE1CE" strokeWidth="2" />
            {pts.map((p, i) => (
              <circle key={i} cx={p.x} cy={p.y} r="3" fill={p.v >= THRESHOLD ? "#EAE1CE" : "#FF6B6B"} />
            ))}
          </svg>
        ) : (
          <p className="text-sm text-[#847668]">Not enough score data to show a trend (needs at least 2 scored tasks).</p>
        )}
        <p className="mt-3 text-[11px] text-[#847668]">Garis putus kuning = ambang lulus ({THRESHOLD}). Titik merah = di bawah ambang.</p>
      </div>

      <div className="mb-8 rounded-2xl border border-[#2A2119] bg-[#16120D] p-5">
        <p className="mb-4 text-sm font-medium text-[#F1EADD]">Outcome distribution</p>
        <div className="space-y-2">
          {dist.map((d) => (
            <div key={d.label} className="flex items-center gap-3">
              <span className="w-14 shrink-0 text-xs text-[#B2A693]">{d.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#0B0906]">
                <div className="h-full rounded-full" style={{ width: (total ? (d.value / total) * 100 : 0) + "%", background: d.color }} />
              </div>
              <span className="w-8 shrink-0 text-right text-xs text-[#847668]">{d.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#2A2119] bg-[#16120D]">
        <p className="border-b border-[#2A2119] px-5 py-3 text-sm font-medium text-[#F1EADD]">Riwayat task ({total})</p>
        {total === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-[#847668]">No tasks yet.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-xs text-[#847668]">
              <tr className="border-b border-[#2A2119]">
                <th className="px-5 py-3">Time</th>
                <th className="px-5 py-3">Result</th>
                <th className="px-5 py-3">Skor</th>
                <th className="px-5 py-3">Reward (RLO)</th>
              </tr>
            </thead>
            <tbody className="text-[#B2A693]">
              {history.map((o, i) => (
                <tr key={i} className="border-b border-[#2A2119] last:border-0">
                  <td className="px-5 py-3 text-[#847668]">{fmt(o.ts)}</td>
                  <td className="px-5 py-3">
                    <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${o.result === "PASS" ? "bg-[#EAE1CE]/15 text-[#EAE1CE]" : o.result === "FAIL" ? "bg-[#FF6B6B]/15 text-[#FF6B6B]" : "bg-[#F5B759]/15 text-[#F5B759]"}`}>{o.result}</span>
                  </td>
                  <td className="px-5 py-3">{o.score ?? "-"}</td>
                  <td className="px-5 py-3">{o.reward}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </main>
  )
}

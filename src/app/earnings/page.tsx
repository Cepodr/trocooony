"use client"

import Link from "next/link"
import { useMemo } from "react"
import { Coins, TrendingUp, Store } from "lucide-react"
import { useAuth } from "@/context/AuthProvider"
import { useReputation } from "@/context/ReputationProvider"
import { useMarketplace } from "@/lib/marketplace"

// Kept in step with the settlement split in the dashboard.
const ROYALTY_RATE = 0.05

function royaltyFor(reward: number) {
  return Math.max(1, Math.round(reward * ROYALTY_RATE))
}

export default function EarningsPage() {
  const { identity } = useAuth()
  const { outcomes } = useReputation()
  const { listings } = useMarketplace()
  const myHandle = identity?.handle ?? null

  const mine = useMemo(
    () => listings.filter((l) => myHandle && l.publisher === myHandle),
    [listings, myHandle]
  )

  const rows = useMemo(() => {
    const ids = new Set(mine.map((l) => l.id))
    return outcomes.filter((o) => ids.has(o.agentId)).sort((a, b) => b.ts - a.ts)
  }, [outcomes, mine])

  const passes = rows.filter((r) => r.result === "PASS")
  const earned = passes.reduce((s, r) => s + royaltyFor(r.reward), 0)
  const volume = passes.reduce((s, r) => s + r.reward, 0)

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <div className="mb-8">
        <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-[#EAE1CE]">
          <Coins className="h-4 w-4" /> Creator earnings
        </p>
        <h1 className="text-2xl font-semibold text-[#F1EADD]">What your agent has earned for you.</h1>
        <p className="mt-1 text-sm text-[#B2A693]">
          Every time someone hires your agent and the work passes review, you receive a royalty of{" "}
          {Math.round(ROYALTY_RATE * 100)} percent of the reward. It is taken from inside the reward, so
          the requester never pays extra, and it is paid in TRLO the moment the task settles.
        </p>
      </div>

      {!myHandle ? (
        <div className="panel panel-grid rounded-xl p-6">
          <p className="text-sm text-[#B2A693]">Sign in to see the earnings of the agent you published.</p>
        </div>
      ) : mine.length === 0 ? (
        <div className="panel panel-grid rounded-xl p-6">
          <p className="text-sm text-[#F1EADD]">You have not published an agent yet.</p>
          <p className="mt-1 text-sm text-[#B2A693]">
            Each account can publish one agent. Once yours is listed, its earnings appear here.
          </p>
          <Link
            href="/marketplace"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#EAE1CE] px-3 py-1.5 text-xs font-medium text-[#0D0A07]"
          >
            <Store className="h-3.5 w-3.5" /> Publish your agent
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="panel panel-grid rounded-xl p-4">
              <p className="text-xs text-[#847668]">Royalties earned</p>
              <p className="mt-1 text-xl font-semibold text-[#F1EADD]">{earned} TRLO</p>
            </div>
            <div className="panel panel-grid rounded-xl p-4">
              <p className="text-xs text-[#847668]">Paid tasks</p>
              <p className="mt-1 text-xl font-semibold text-[#F1EADD]">{passes.length}</p>
            </div>
            <div className="panel panel-grid rounded-xl p-4">
              <p className="text-xs text-[#847668]">Volume settled</p>
              <p className="mt-1 text-xl font-semibold text-[#F1EADD]">{volume} TRLO</p>
            </div>
          </div>

          {mine.map((l) => (
            <div key={l.id} className="panel panel-grid mb-6 rounded-xl p-4">
              <p className="text-sm font-medium text-[#F1EADD]">{l.name}</p>
              <p className="text-xs text-[#847668]">{l.specialty}</p>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-[#B2A693]">
                <TrendingUp className="h-3.5 w-3.5" /> Listed at {l.price} TRLO per task
              </p>
            </div>
          ))}

          <div className="panel panel-grid overflow-hidden rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-[#847668]">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Result</th>
                  <th className="px-4 py-3 font-medium">Score</th>
                  <th className="px-4 py-3 font-medium">Reward</th>
                  <th className="px-4 py-3 font-medium">Your royalty</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-sm text-[#B2A693]">
                      No one has hired your agent yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr key={i} className="border-t border-[#1F1913]">
                      <td className="px-4 py-3 text-[#B2A693]">{new Date(r.ts).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className={r.result === "PASS" ? "text-[#F5B759]" : "text-[#FF6B6B]"}>{r.result}</span>
                      </td>
                      <td className="px-4 py-3 text-[#B2A693]">{r.score ?? "—"}</td>
                      <td className="px-4 py-3 text-[#B2A693]">{r.reward} TRLO</td>
                      <td className="px-4 py-3 text-[#F1EADD]">
                        {r.result === "PASS" ? royaltyFor(r.reward) + " TRLO" : "0 TRLO"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  )
}

"use client"

import { useState } from "react"
import Link from "next/link"
import { Store, ShieldCheck, TrendingUp, Coins, Plus, ArrowRight, Umbrella, Info, Bot, Wallet } from "lucide-react"
import { AGENTS, BASE_PRICE } from "@/lib/agents"
import { useReputation } from "@/context/ReputationProvider"
import { useMarketplace } from "@/lib/marketplace"
import { useCredits } from "@/context/CreditsProvider"
import { useAuth } from "@/context/AuthProvider"
import TopUpModal from "@/components/TopUpModal"


export default function MarketplacePage() {
  // Ownership is read from the same identity that owns the wallet balance.
  const { identity } = useAuth()
  const myHandle = identity?.handle ?? null
  const { agents } = useReputation()
  const { listings, pool, poolBalance, publishListing } = useMarketplace()
  const { rlo, trlo, deposit, withdraw } = useCredits()

  const repOf = (id: string) => agents.find((a: any) => a.agentId === id)?.reputation ?? null
  const tasksOf = (id: string) => agents.find((a: any) => a.agentId === id)?.tasks ?? 0

  const [name, setName] = useState("")
  const [specialty, setSpecialty] = useState("")
  const [persona, setPersona] = useState("")
  const [price, setPrice] = useState(50)
  const [formErr, setFormErr] = useState("")
  const [depositAmt, setDepositAmt] = useState(100)
  const [topupOpen, setTopupOpen] = useState(false)
  const [walletMsg, setWalletMsg] = useState<{ text: string; bad: boolean } | null>(null)

  async function submit() {
    if (name.trim().length < 3 || specialty.trim().length < 3 || persona.trim().length < 15) {
      setFormErr("Provide a clear name, specialty, and persona (min. 15 characters).")
      return
    }
    setFormErr("")
    const res = await publishListing({ name: name.trim(), specialty: specialty.trim(), persona: persona.trim(), price, publisher: myHandle ?? "community" })
    if (!res.ok) { setFormErr(res.error || "Could not publish. Please try again."); return }
    setName(""); setSpecialty(""); setPersona(""); setPrice(50)
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8">
        <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-[#EAE1CE]"><Store className="h-4 w-4" /> Gateway Marketplace</p>
        <h1 className="text-2xl font-semibold text-[#F1EADD]">Hire agents. Publish yours. Earn TRLO.</h1>
        <p className="mt-1 text-sm text-[#B2A693]">
          A permissionless market for AI agent labor, reputation is on-chain, payments are escrowed, and tasks can be insured against failure.
        </p>
      </div>

      <div className="mb-8 rounded-2xl panel panel-grid p-6">
        <div className="mb-4 flex items-center gap-2">
          <Wallet className="h-4 w-4 text-[#EAE1CE]" />
          <h2 className="text-sm font-semibold text-[#F1EADD]">Your Wallet</h2>
          <span className="ml-auto text-xs text-[#847668]">Top up once on-chain, then spend everywhere in TRLO, gasless SCALE</span>
        </div>
        <div className="mb-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl panel p-3">
            <p className="mb-1 text-[11px] text-[#847668]">RLO, on-chain wallet</p>
            <p className="text-lg font-semibold text-[#F1EADD]">{rlo} RLO</p>
          </div>
          <div className="rounded-xl panel p-3">
            <p className="mb-1 text-[11px] text-[#847668]">TRLO, in-app balance</p>
            <p className="text-lg font-semibold text-[#EAE1CE]">{trlo} TRLO</p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1.5 block text-xs text-[#B2A693]">Amount</label>
            <input type="number" min={1} value={depositAmt === 0 ? "" : depositAmt} onChange={(e) => setDepositAmt(e.target.value === "" ? 0 : Number(e.target.value))} onFocus={(e) => e.target.select()}
              className="w-40 rounded-lg panel px-3 py-2 text-sm text-[#F1EADD] outline-none focus:border-[#EAE1CE]/50" />
          </div>
          <button onClick={async () => { const r = await deposit(depositAmt); setWalletMsg(r.ok ? { text: depositAmt + " RLO converted into " + depositAmt + " TRLO.", bad: false } : { text: r.error || "The conversion did not go through.", bad: true }) }}
            className="rounded-lg bg-[#EAE1CE] px-4 py-2 text-sm font-medium text-[#0D0A07] hover:bg-[#F4EEDF]">Deposit RLO to TRLO</button>
          <button onClick={async () => { const r = await withdraw(depositAmt); setWalletMsg(r.ok ? { text: depositAmt + " TRLO moved back into RLO.", bad: false } : { text: r.error || "The withdrawal did not go through.", bad: true }) }}
            className="rounded-lg border border-[#2A2119] px-4 py-2 text-sm text-[#B2A693] hover:border-[#EAE1CE]/50 hover:text-[#EAE1CE]">Withdraw to RLO</button>
          <button onClick={() => setTopupOpen(true)}
            className="rounded-lg border border-[#EAE1CE]/40 px-4 py-2 text-sm font-medium text-[#EAE1CE] hover:bg-[#EAE1CE]/10">Top up (ETH to RLO)</button>
          <p className="flex items-center gap-1.5 text-xs text-[#847668]"><Info className="h-3.5 w-3.5" />1 RLO = 1 TRLO. Deposit converts to spendable TRLO; withdraw converts back.</p>
          {walletMsg && (
            <p className={"w-full text-xs " + (walletMsg.bad ? "text-[#F5B759]" : "text-[#B2A693]")}>{walletMsg.text}</p>
          )}
        </div>
        <TopUpModal open={topupOpen} onClose={() => setTopupOpen(false)} />
      </div>

      <div className="mb-8 rounded-2xl panel panel-grid p-6">
        <div className="mb-4 flex items-center gap-2">
          <Umbrella className="h-4 w-4 text-[#EAE1CE]" />
          <h2 className="text-sm font-semibold text-[#F1EADD]">Insurance Pool</h2>
          <span className="ml-auto text-xs text-[#847668]">Parametric, restores your full reward on judged failure</span>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            { label: "Pool balance", value: `${poolBalance} TRLO`, accent: true },
            { label: "Deposits", value: `${pool.deposits} TRLO` },
            { label: "Premiums earned", value: `${pool.premiums} TRLO` },
            { label: "Claims paid", value: `${pool.payouts} TRLO` },
            { label: "Policies / Claims", value: `${pool.policies} / ${pool.claims}` },
          ].map((m) => (
            <div key={m.label} className="rounded-xl panel p-3">
              <p className="mb-1 text-[11px] text-[#847668]">{m.label}</p>
              <p className={`text-lg font-semibold ${m.accent ? "text-[#EAE1CE]" : "text-[#F1EADD]"}`}>{m.value}</p>
            </div>
          ))}
        </div>

        <p className="flex items-center gap-1.5 text-xs text-[#847668]"><Info className="h-3.5 w-3.5" />Auto-funded. Requesters pay a risk-priced premium (in TRLO) into this pool, and it pays back the 30 percent effort fee on judged failure, so the reward returns in full and the only cost is the premium. Coverage unlocks after an agent has 5 settled tasks. A missed deadline is refunded in full instead of claimed. Manage your balance in Your Wallet above.</p>
      </div>

      <h2 className="mb-3 text-sm font-semibold text-[#F1EADD]">Available agents</h2>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {AGENTS.map((a) => (
          <div key={a.id} className="rounded-2xl panel panel-grid p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#EAE1CE]/10 text-[#EAE1CE]"><a.icon className="h-4 w-4" /></span>
                <div>
                  <p className="text-sm font-semibold text-[#F1EADD]">{a.name}</p>
                  <p className="text-[11px] text-[#847668]">{a.specialty}</p>
                </div>
              </div>
              <span className="rounded-md bg-[#EAE1CE]/10 px-2 py-0.5 text-[11px] font-medium text-[#EAE1CE]">Official</span>
            </div>
            <div className="mb-4 flex items-center gap-4 text-xs text-[#B2A693]">
              <span className="flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" />Rep {repOf(a.id) ?? "-"}</span>
              <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5" />{tasksOf(a.id)} tasks</span>
              <span className="flex items-center gap-1"><Coins className="h-3.5 w-3.5" />{BASE_PRICE[a.id] ?? 50} TRLO</span>
            </div>
            <Link href="/dashboard" className="flex items-center justify-center gap-1.5 rounded-lg border border-[#2A2119] py-2 text-sm text-[#F1EADD] hover:border-[#EAE1CE]/50 hover:text-[#EAE1CE]">
              Hire agent <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ))}

        {listings.map((l) => (
          <div key={l.id} className="rounded-2xl panel panel-grid p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#F4EEDF]/10 text-[#F4EEDF]"><Bot className="h-4 w-4" /></span>
                <div>
                  <p className="text-sm font-semibold text-[#F1EADD]">{l.name}</p>
                  <p className="text-[11px] text-[#847668]">{l.specialty}</p>
                </div>
              </div>
              
            </div>
            <p className="mb-3 line-clamp-2 text-xs text-[#B2A693]">{l.persona}</p>
            <div className="flex items-center justify-between text-xs text-[#B2A693]">
              <span className="flex items-center gap-1"><Coins className="h-3.5 w-3.5" />{l.price} TRLO</span>
              {myHandle && l.publisher === myHandle ? (
                  <Link href="/earnings" className="rounded-lg border border-[#EAE1CE]/40 bg-[#EAE1CE]/10 px-2.5 py-1 text-[11px] font-medium text-[#F4EEDF] transition-colors hover:border-[#EAE1CE] hover:bg-[#EAE1CE]/20">Yours · See earnings</Link>
                ) : (
                  <span className="rounded-md bg-[#F4EEDF]/5 px-2 py-0.5 text-[11px] text-[#847668]">{l.publisher && l.publisher !== "you" ? "By " + l.publisher : "Community"}</span>
                )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl panel panel-grid p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#F1EADD]"><Plus className="h-4 w-4 text-[#EAE1CE]" /> Publish your agent</h2>
        <p className="-mt-3 mb-4 text-xs text-[#B2A693]">
          Each account can publish one agent. When someone hires it and the work passes review, you earn a royalty.{" "}
          <Link href="/earnings" className="text-[#EAE1CE] underline underline-offset-2">See your earnings</Link>.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs text-[#B2A693]">Agent name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Atlas"
              className="w-full rounded-lg panel px-3 py-2 text-sm text-[#F1EADD] outline-none focus:border-[#EAE1CE]/50" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs text-[#B2A693]">Specialty</label>
            <input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="e.g. Data analysis"
              className="w-full rounded-lg panel px-3 py-2 text-sm text-[#F1EADD] outline-none focus:border-[#EAE1CE]/50" />
          </div>
        </div>
        <div className="mt-4">
          <label className="mb-1.5 block text-xs text-[#B2A693]">Persona / system prompt</label>
          <textarea value={persona} onChange={(e) => setPersona(e.target.value)} rows={2} placeholder="You are a meticulous data analyst who…"
            className="w-full resize-none rounded-lg panel px-3 py-2 text-sm text-[#F1EADD] outline-none focus:border-[#EAE1CE]/50" />
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1.5 block text-xs text-[#B2A693]">Price / task (TRLO)</label>
            <input type="number" min={1} value={price === 0 ? "" : price} onChange={(e) => setPrice(e.target.value === "" ? 0 : Number(e.target.value))} onFocus={(e) => e.target.select()}
              className="w-32 rounded-lg panel px-3 py-2 text-sm text-[#F1EADD] outline-none focus:border-[#EAE1CE]/50" />
          </div>
          <button onClick={submit} className="rounded-lg bg-[#EAE1CE] px-4 py-2 text-sm font-medium text-[#0D0A07] hover:bg-[#F4EEDF]">Publish</button>
        </div>
        {formErr && <p className="mt-3 text-xs text-[#FF6B6B]">{formErr}</p>}
      </div>
    </main>
  )
}

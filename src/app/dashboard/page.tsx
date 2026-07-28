"use client"
import { useToast } from "@/context/ToastProvider"

import { useEffect, useMemo, useState } from "react"
import {
  Coins, ShieldCheck, Activity, Send, Gavel,
  CheckCircle2, XCircle, Loader2, Sparkles, Bot, Lock, Umbrella,
} from "lucide-react"
import { useAuth } from "@/context/AuthProvider"
import { useReputation } from "@/context/ReputationProvider"
import { useMarketplace } from "@/lib/marketplace"
import { AGENTS } from "@/lib/agents"
import { useCredits } from "@/context/CreditsProvider"
import { svgToPngBase64 } from "@/lib/svg-to-png"

// Set to false to fall back to the text judge everywhere.
const VISION_JUDGE = true

const STEPS = ["Mint", "Escrow TRLO", "A2A Dispatch", "Deliver", "Judge (webcall)", "Settle"]
const STEP_INDEX: Record<string, number> = { idle: 0, escrow: 1, dispatch: 2, working: 3, judging: 4, done: 5, refunded: 5 }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const fakeTx = () => "0x" + Math.random().toString(16).slice(2, 10)

type Row = { id: string; agent: string; reward: number; status: "PAID" | "REFUNDED" | "AUTO-REFUND"; score: number | null; tx: string; insured: boolean }

export default function Dashboard() {
  const { identity } = useAuth()
  const { recordOutcome, agents: repAgents } = useReputation()
  const { listings, collectPremium, payClaim, releaseCoverage, poolBalance, poolLoading } = useMarketplace()
  const { notify } = useToast()
  const { rlo, trlo, deposit, spendTrlo, earnTrlo } = useCredits()

  const [agentId, setAgentId] = useState("scribe")
  const [prompt, setPrompt] = useState("")
  const [criteria, setCriteria] = useState("")
  const [reward, setReward] = useState(50)
  const [deadline, setDeadline] = useState(25)
  const [insured, setInsured] = useState(false)

  const [status, setStatus] = useState<string>("idle")
  const [output, setOutput] = useState("")
  const [score, setScore] = useState<number | null>(null)
  const [reason, setReason] = useState("")
  const [verdict, setVerdict] = useState<string | null>(null)
  const [breakdown, setBreakdown] = useState<{ key: string; label: string; weight: number; score: number; note: string }[]>([])
  const [flags, setFlags] = useState<string[]>([])
  const [insuranceMsg, setInsuranceMsg] = useState("")
  const [error, setError] = useState("")
  const [history, setHistory] = useState<Row[]>([])
  useEffect(() => { fetch("/api/ledger").then((r) => r.json()).then((d) => { if (Array.isArray(d.rows)) { const raw = d.rows as Array<Omit<Row, "status"> & { status: string }>; setHistory(raw.map((r) => ({ ...r, status: r.status === "PASS" ? "PAID" : r.status === "FAIL" ? "REFUNDED" : r.status })) as Row[]) } }).catch(() => {}) }, [])

  const communityAgents = useMemo(() => listings.map((l) => ({ id: l.id, name: l.name, icon: Bot, specialty: l.specialty + " (Community)", persona: l.persona })), [listings])
  const allAgents = useMemo(() => [...AGENTS, ...communityAgents], [communityAgents])
  const agent = allAgents.find((a) => a.id === agentId) || AGENTS[0]
  const busy = ["escrow", "dispatch", "working", "judging"].includes(status)
  const repRow = repAgents.find((r) => r.agentId === agentId)
  const repTasks = repRow ? repRow.tasks : 0
  const observedFail = repRow && repTasks > 0 ? 1 - repRow.passRate / 100 : 0.25
  const credibility = repTasks / (repTasks + 5)
  const expectedLoss = credibility * observedFail + (1 - credibility) * 0.25
  const rawRate = expectedLoss * 0.3 * poolLoading
  const MAX_RATE = 0.24
  const premiumRate = Math.min(MAX_RATE, Math.max(0.01, rawRate))
  const premium = Math.max(1, Math.round(reward * premiumRate))
  const COVERAGE = 0.3
  const claimPayout = Math.max(1, Math.round(reward * COVERAGE))
  const insurable = repTasks >= 5 && rawRate <= MAX_RATE
  const tooRisky = repTasks >= 5 && rawRate > MAX_RATE

  function loadSample() {
    if (busy) return
    setAgentId("scribe")
    setPrompt("Write a punchy 5-tweet thread explaining how Rialo's native webcalls let smart contracts call AI agents directly, with no oracles. Audience: crypto builders. Strong hook first, clear CTA last.")
    setCriteria("Professional tone. Exactly 5 tweets numbered 1/5 to 5/5, each under 280 characters. Accurate about Rialo (an L1 blockchain by Subzero Labs, NOT the city Rialto). Strong opening hook and a clear closing CTA.")
    setReward(50)
    setDeadline(25)
    setInsured(true)
    setOutput(""); setScore(null); setReason(""); setVerdict(null); setInsuranceMsg(""); setError(""); setStatus("idle")
  }

  function resetForm() {
    setPrompt(""); setCriteria(""); setOutput(""); setScore(null)
    setReason(""); setVerdict(null); setInsuranceMsg(""); setError(""); setStatus("idle")
  }
  function selectAgent(id: string) {
    if (busy) return
    setAgentId(id); resetForm()
  }

  const metrics = useMemo(() => {
    const tasks = history.length
    const paid = history.filter((h) => h.status === "PAID")
    const rloPaid = paid.reduce((s, h) => s + h.reward, 0)
    const scored = history.filter((h) => h.score != null) as Row[]
    const avg = scored.length ? Math.round(scored.reduce((s, h) => s + (h.score || 0), 0) / scored.length) : 0
    const passRate = tasks ? Math.round((paid.length / tasks) * 100) : 0
    return { tasks, rloPaid, avg, passRate }
  }, [history])

  async function runTask() {
    if (!prompt.trim() || busy) return
    if (trlo < reward) { notify(`Not enough TRLO (need ${reward}, have ${trlo}). Deposit RLO into TRLO in Marketplace first.`, "error"); return }
    const escrowed = await spendTrlo(reward)
    if (!escrowed) { notify("Could not lock escrow. Insufficient balance.", "error"); return }
    setError(""); setOutput(""); setScore(null); setReason(""); setVerdict(null); setInsuranceMsg("")

    const isInsured = insured && insurable
    // Pool data loads asynchronously. Selling a policy before the pool balance is
    // known would underwrite coverage the pool has not confirmed it can pay.
    if (isInsured && !(poolBalance > 0)) {
      notify("Pool data is still loading. Please try again in a moment.", "warn")
      setStatus("idle")
      return
    }
    const coverAtMint = Math.min(claimPayout, poolBalance)

    setStatus("escrow"); await sleep(700)
    if (isInsured) { await spendTrlo(premium); collectPremium(premium, coverAtMint) }
    setStatus("dispatch"); await sleep(600)
    setStatus("working")

    const fetchP = fetch("/api/scale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, criteria, persona: agent.persona }),
    }).then((r) => r.json())

    const timeoutP = new Promise((_, rej) => setTimeout(() => rej({ __timeout: true }), deadline * 1000))

    try {
      let data: any = await Promise.race([fetchP, timeoutP])
      if (data?.error) { setError(data.error); setStatus("idle"); notify(data.error, "error"); void earnTrlo(reward); return }

      // A text model cannot see a drawing, so the rendered artifact goes to a vision judge.
      // If that judge is unavailable for any reason, the text verdict already in hand still stands.
      if (VISION_JUDGE && data?.outputType === "svg" && typeof data.output === "string" && data.output.trim().startsWith("<svg")) {
        const png = await svgToPngBase64(data.output)
        if (png) {
          try {
            const vres = await fetch("/api/judge-vision", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt, criteria, image: png }),
            })
            const vjson = await vres.json()
            if (!vjson?.error && typeof vjson.score === "number") data = { ...data, ...vjson }
          } catch {}
        }
      }
      setStatus("judging"); await sleep(800)
      setOutput(data.output); setScore(data.score); setReason(data.reason); setVerdict(data.verdict); setBreakdown(data.breakdown || []); setFlags(data.flags || [])
      const passed = data.verdict === "PASS"
      if (passed && isInsured) releaseCoverage(coverAtMint)
      if (!passed && isInsured) {
        const pay = coverAtMint
        void payClaim(pay).then((paidOut) => { if (paidOut > 0) void earnTrlo(paidOut) }); notify("Insurance paid. You received your full reward back, minus the premium.", "warn")
        setInsuranceMsg(`Insurance paid ${pay} TRLO. Your reward came back in full, so you only paid the premium.`)
      }
      setStatus(passed ? "done" : "refunded"); if (!passed) void earnTrlo(reward - claimPayout)
      notify(passed ? `${agent.name} passed:  ${data.score}/100, ${reward} TRLO released.` : `${agent.name} failed: ${data.score}/100. Escrow refunded, minus the effort fee to the worker.`, passed ? "success" : "error")
      const _row: Row = { id: crypto.randomUUID(), agent: agent.name, reward, status: passed ? "PAID" : "REFUNDED", score: data.score, tx: fakeTx(), insured: isInsured }; setHistory((h) => [_row, ...h]); fetch("/api/ledger", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(_row) }).catch(() => {})
      recordOutcome({ agentId: agent.id, agentName: agent.name, result: passed ? "PASS" : "FAIL", score: data.score, reward })
    } catch (e: any) {
      if (e?.__timeout) {
        setStatus("refunded"); setVerdict("TIMEOUT"); void earnTrlo(reward); notify(`${agent.name} missed the deadline. Escrow auto-refunded.`, "warn")
        setReason("Deadline missed. Escrow auto-refunded by a Rialo native timer.")
        if (isInsured) releaseCoverage(coverAtMint)
        if (isInsured) {
          const pay = coverAtMint
          notify("Deadline missed. The escrow auto-refunded in full. Insurance covers judged failure only.", "warn")
          setInsuranceMsg(`No claim was paid. Insurance covers judged failure only, so the coverage of ${pay} TRLO did not apply here.`)
        }
        const _row: Row = { id: crypto.randomUUID(), agent: agent.name, reward, status: "AUTO-REFUND", score: null, tx: fakeTx(), insured: isInsured }; setHistory((h) => [_row, ...h]); fetch("/api/ledger", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(_row) }).catch(() => {})
        recordOutcome({ agentId: agent.id, agentName: agent.name, result: "REFUND", score: null, reward })
      } else {
        setError("Network error. Please try again."); setStatus("idle"); void earnTrlo(reward); notify("Network error. Please try again.", "error")
      }
    }
  }

  const activeStep = STEP_INDEX[status] ?? 0

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8">
        <p className="mb-1 text-sm font-medium text-[#EAE1CE]">SCALE Console</p>
        <h1 className="text-2xl font-semibold text-[#F1EADD]">Mint an agent labor task</h1>
        <p className="mt-1 text-sm text-[#B2A693]">
          Escrow-backed work with autonomous judging, deadline auto-refunds, and optional failure insurance, powered by Rialo native timers and webcalls.
        </p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { icon: <Activity className="h-4 w-4" />, label: "Tasks run", value: metrics.tasks },
          { icon: <Coins className="h-4 w-4" />, label: "TRLO paid out", value: metrics.rloPaid },
          { icon: <ShieldCheck className="h-4 w-4" />, label: "Pass rate", value: metrics.passRate + "%" },
          { icon: <Sparkles className="h-4 w-4" />, label: "Avg. score", value: metrics.avg },
        ].map((m) => (
          <div key={m.label} className="rounded-xl panel panel-grid p-4">
            <div className="mb-2 flex items-center gap-1.5 text-[#847668]">{m.icon}<span className="text-xs">{m.label}</span></div>
            <div className="text-2xl font-semibold text-[#F1EADD]">{m.value}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl panel panel-grid p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#F1EADD]">New SCALE Task</h2>
            <button onClick={loadSample} className="text-xs font-medium text-[#EAE1CE] hover:text-[#F4EEDF]">Load sample</button>
            <button onClick={resetForm} className="text-xs text-[#847668] hover:text-[#EAE1CE]">Clear</button>
          </div>

          <label className="mb-1.5 block text-xs text-[#B2A693]">Worker agent from the Rialo Agent Registry</label>
          <div className="mb-4 grid grid-cols-2 gap-2">
            {allAgents.map((a) => (
              <button key={a.id} onClick={() => selectAgent(a.id)} disabled={busy}
                className={`rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:opacity-50 ${agentId === a.id ? "border-[#EAE1CE] bg-[#EAE1CE]/10 text-[#F1EADD]" : "border-[#2A2119] text-[#B2A693] hover:border-[#EAE1CE]/40"}`}>
                <span className="flex items-center gap-1.5 font-medium"><a.icon className="h-4 w-4" />{a.name}</span>
                <span className="mt-0.5 block text-[11px] text-[#847668]">{a.specialty}</span>
              </button>
            ))}
          </div>

          <label className="mb-1.5 block text-xs text-[#B2A693]">Task prompt</label>
          <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3}
            placeholder="Describe the task for this agent…"
            className="mb-4 w-full resize-none rounded-lg panel px-3 py-2.5 text-sm text-[#F1EADD] outline-none placeholder:text-[#847668] focus:border-[#EAE1CE]/50" />

          <label className="mb-1.5 block text-xs text-[#B2A693]">Quality criteria (Judge agent checks this)</label>
          <input value={criteria} onChange={(e) => setCriteria(e.target.value)}
            placeholder="What must the result satisfy to pass?"
            className="mb-4 w-full rounded-lg panel px-3 py-2.5 text-sm text-[#F1EADD] outline-none placeholder:text-[#847668] focus:border-[#EAE1CE]/50" />

          <div className="mb-4 grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs text-[#B2A693]">Reward (TRLO)</label>
              <input type="number" min={1} value={reward === 0 ? "" : reward} onChange={(e) => setReward(e.target.value === "" ? 0 : Number(e.target.value))} onFocus={(e) => e.target.select()}
                className="w-full rounded-lg panel px-3 py-2.5 text-sm text-[#F1EADD] outline-none focus:border-[#EAE1CE]/50" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-[#B2A693]">Deadline (seconds)</label>
              <input type="number" min={1} value={deadline === 0 ? "" : deadline} onChange={(e) => setDeadline(e.target.value === "" ? 0 : Number(e.target.value))} onFocus={(e) => e.target.select()}
                className="w-full rounded-lg panel px-3 py-2.5 text-sm text-[#F1EADD] outline-none focus:border-[#EAE1CE]/50" />
            </div>
          </div>

          <button onClick={() => setInsured((v) => !v)} disabled={!insurable}
            className={`mb-4 flex w-full items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${insured ? "border-[#EAE1CE] bg-[#EAE1CE]/10 text-[#F1EADD]" : "border-[#2A2119] text-[#B2A693] hover:border-[#EAE1CE]/40"}`}>
            <Umbrella className="h-4 w-4" />
            <span>{insurable ? "Insure this task" : tooRisky ? "Too risky to insure" : "Insurance locked"}</span>
            <span className="ml-auto text-xs text-[#847668]">{insurable ? "Insurance " + premium + " TRLO (" + Math.round(premiumRate * 100) + "% of reward) · Pays back " + claimPayout + " TRLO if the judge fails the work" : tooRisky ? "This agent fails too often to insure. The premium would exceed the payout." : "Needs 5 settled tasks for this agent (" + repTasks + "/5)"} · Pool {poolBalance} TRLO</span>
            <span className={`h-4 w-4 rounded border ${insured ? "border-[#EAE1CE] bg-[#EAE1CE]" : "border-[#847668]"}`} />
          </button>

            {identity && trlo < reward && (
              <div className="mb-3 flex items-center gap-2 rounded-lg border border-[#FF6B6B]/30 bg-[#FF6B6B]/10 px-3 py-2 text-xs text-[#FF6B6B]">
                <Lock className="h-3.5 w-3.5" /> Not enough TRLO for reward {reward}. {rlo > 0 ? <button onClick={() => deposit(rlo)} className="ml-1 underline hover:text-[#EAE1CE]">Deposit {rlo} RLO into TRLO</button> : <span className="ml-1">Top up first to get RLO.</span>}
              </div>
            )}
            {!identity && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-[#F5B759]/30 bg-[#F5B759]/10 px-3 py-2 text-xs text-[#F5B759]">
              <Lock className="h-3.5 w-3.5" /> Sign in to mint a task (gasless).
            </div>
          )}

          <button onClick={runTask} disabled={busy || !prompt.trim() || !identity || trlo < reward}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#EAE1CE] px-4 py-2.5 text-sm font-medium text-[#0D0A07] transition-colors hover:bg-[#F4EEDF] disabled:cursor-not-allowed disabled:opacity-40">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {busy ? "Processing on Rialo…" : "Mint SCALE task"}
          </button>

          {error && <p className="mt-3 text-center text-xs text-[#FF6B6B]">{error}</p>}
        </div>

        <div className="rounded-2xl panel panel-grid p-6">
          <h2 className="mb-4 text-sm font-semibold text-[#F1EADD]">Task lifecycle</h2>

          <div className="mb-6 space-y-2.5">
            {STEPS.map((s, i) => {
              const active = i === activeStep && busy
              const done = i < activeStep || status === "done" || (status === "refunded" && i <= activeStep)
              const refundStep = status === "refunded" && i === activeStep
              return (
                <div key={s} className="flex items-center gap-3">
                  <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] ${refundStep ? "bg-[#FF6B6B] text-white" : done ? "bg-[#EAE1CE] text-[#0D0A07]" : active ? "bg-[#EAE1CE]/20 text-[#EAE1CE]" : "bg-[#0B0906] text-[#847668]"}`}>
                    {active ? <Loader2 className="h-3 w-3 animate-spin" /> : i + 1}
                  </span>
                  <span className={`text-sm ${done || active ? "text-[#F1EADD]" : "text-[#847668]"}`}>{s}</span>
                </div>
              )
            })}
          </div>

          {verdict && (
            <div className={`mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${verdict === "PASS" ? "bg-[#EAE1CE]/10 text-[#EAE1CE]" : "bg-[#FF6B6B]/10 text-[#FF6B6B]"}`}>
              {verdict === "PASS" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {verdict === "PASS" ? "PASS: worker paid" : verdict === "TIMEOUT" ? "AUTO-REFUND: deadline missed" : "FAIL: requester refunded"}
              {score != null && <span className="ml-auto font-semibold">{score}/100</span>}
            </div>
          )}

          {insuranceMsg && (
            <div className="mb-3 flex items-center gap-2 rounded-lg bg-[#F4EEDF]/10 px-3 py-2 text-sm text-[#F4EEDF]">
              <Umbrella className="h-4 w-4" /> {insuranceMsg}
            </div>
          )}

          {score != null && (
            <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-[#0B0906]">
              <div className={`h-full ${score >= 70 ? "bg-[#EAE1CE]" : "bg-[#FF6B6B]"}`} style={{ width: score + "%" }} />
            </div>
          )}
          {reason && <p className="mb-4 flex items-start gap-1.5 text-xs text-[#B2A693]"><Gavel className="mt-0.5 h-3.5 w-3.5 shrink-0" />{reason}</p>}
          {breakdown.length > 0 && verdict !== "TIMEOUT" && (
            <div className="mb-4 rounded-lg panel p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[#B2A693]"><Gavel className="h-3.5 w-3.5" />Judge rubric</p>
              <div className="space-y-2">
                {breakdown.map((d) => (
                  <div key={d.key}>
                    <div className="flex items-center justify-between text-[11px] text-[#847668]">
                      <span>{d.label} <span className="text-[#5f554a]">· {Math.round(d.weight * 100)}%</span></span>
                      <span className="font-semibold text-[#B2A693]">{d.score}</span>
                    </div>
                    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[#1B1610]">
                      <div className={"h-full " + (d.score >= 70 ? "bg-[#EAE1CE]" : d.score >= 40 ? "bg-[#F5B759]" : "bg-[#FF6B6B]")} style={{ width: d.score + "%" }} />
                    </div>
                    {d.note && <p className="mt-1 text-[11px] leading-snug text-[#847668]">{d.note}</p>}
                  </div>
                ))}
              </div>
              {flags.length > 0 && (
                <div className="mt-3 border-t border-[#2A2119] pt-2">
                  <p className="mb-1 text-[11px] font-semibold text-[#F5B759]">Flags</p>
                  <ul className="space-y-0.5">
                    {flags.map((fl, i) => (
                      <li key={i} className="flex items-start gap-1 text-[11px] text-[#B2A693]"><span className="text-[#F5B759]">•</span>{fl}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {output && (
            <>
              {output.trim().startsWith("<svg") && (
                <div className="mb-2 flex flex-col items-center gap-3 rounded-lg panel p-4">
                  <div
                    className="w-full max-w-[240px] [&>svg]:h-auto [&>svg]:w-full"
                    dangerouslySetInnerHTML={{ __html: output }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([output], { type: "image/svg+xml" })
                      const href = URL.createObjectURL(blob)
                      const a = document.createElement("a")
                      a.href = href
                      a.download = "scale-artifact.svg"
                      a.click()
                      URL.revokeObjectURL(href)
                    }}
                    className="rounded-lg border border-[#2A2119] px-3 py-1.5 text-xs text-[#B2A693] hover:border-[#3A2F23]"
                  >
                    Download SVG
                  </button>
                </div>
              )}
              <div className="max-h-56 overflow-auto rounded-lg panel p-3 text-sm text-[#F1EADD] whitespace-pre-wrap">{output}</div>
            </>
          )}
          {!output && !busy && !verdict && (
            <p className="flex items-center gap-2 text-sm text-[#847668]"><Bot className="h-4 w-4" />Mint a task to dispatch it to a worker agent.</p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl panel panel-grid p-6">
        <h2 className="mb-4 text-sm font-semibold text-[#F1EADD]">Task Ledger</h2>
        <p className="mb-4 max-w-2xl text-xs leading-relaxed text-[#847668]">Task content never enters the ledger, only its settlement does. On Rialo the judge runs inside a TEE, so an outcome can be verified without exposing the work. Settlement refs are simulated in this demo; on mainnet each row carries a real on-chain transaction hash.</p>
        {history.length === 0 ? (
          <p className="text-sm text-[#847668]">No settled tasks yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs text-[#847668]">
                <tr><th className="pb-2">Agent</th><th className="pb-2">TRLO</th><th className="pb-2">Score</th><th className="pb-2">Insured</th><th className="pb-2">Status</th><th className="pb-2">Settlement ref</th><th className="pb-2">Task content</th></tr>
              </thead>
              <tbody className="text-[#B2A693]">
                {history.map((h) => (
                  <tr key={h.id} className="border-t border-[#2A2119]">
                    <td className="py-2 text-[#F1EADD]">{h.agent}</td>
                    <td className="py-2">{h.reward}</td>
                    <td className="py-2">{h.score ?? "-"}</td>
                    <td className="py-2">{h.insured ? <ShieldCheck className="inline h-3.5 w-3.5 text-[#EAE1CE]" /> : "-"}</td>
                    <td className="py-2"><span className={h.status === "PAID" ? "text-[#EAE1CE]" : "text-[#F5B759]"}>{h.status}</span></td>
                    <td className="py-2 font-mono text-xs text-[#EAE1CE]">{h.tx}</td><td className="py-2 text-xs text-[#847668]">Confidential</td>
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

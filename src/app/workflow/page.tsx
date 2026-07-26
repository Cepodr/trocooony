"use client"

import { useState } from "react"
import { Workflow, Play, Loader2, CheckCircle2, XCircle, ArrowDown, Lock, Sparkles, RotateCcw, AlertTriangle } from "lucide-react"
import { useAuth } from "@/context/AuthProvider"
import { AGENTS } from "@/lib/agents"

type StepStatus = "idle" | "running" | "done" | "error"
type Step = { id: string; role: string; agentId: string; instruction: string; status: StepStatus; output: string }

const DEFAULT_STEPS: Step[] = [
  { id: "research", role: "Research", agentId: "sage", instruction: "Research the objective. List key facts, angles, the target audience, and 3 strong hooks.", status: "idle", output: "" },
  { id: "draft", role: "Draft", agentId: "scribe", instruction: "Using the research, write a polished, well-structured draft that fulfils the objective.", status: "idle", output: "" },
  { id: "review", role: "Review & Finalize", agentId: "sage", instruction: "Critically review the draft for clarity, accuracy, and impact. Then output the improved FINAL version only.", status: "idle", output: "" },
]

const freshSteps = () => DEFAULT_STEPS.map((s) => ({ ...s, status: "idle" as StepStatus, output: "" }))

function tokenIsGibberish(token: string) {
  const w = token.replace(/[^a-z]/gi, "")
  if (w.length < 4) return false
  if (!/[aeiou]/i.test(w)) return true
  if (/[^aeiou\W\d]{4,}/i.test(w)) return true
  return false
}
function validateObjective(raw: string): string | null {
  const t = raw.trim()
  if (t.length < 15) return "Objective terlalu pendek. Tulis tujuan yang jelas dalam satu kalimat."
  const words = t.split(/\s+/).filter((w) => w.replace(/[^a-z]/gi, "").length >= 2)
  if (words.length < 3) return "Tulis objective sebagai kalimat yang bermakna (min. 3 kata), bukan kata acak."
  const alphaTokens = t.split(/[\s,._/-]+/).filter((w) => /[a-z]/i.test(w))
  const bad = alphaTokens.filter(tokenIsGibberish).length
  if (bad > 0 && bad >= Math.ceil(alphaTokens.length / 2)) {
    return "Objective sepertinya berisi teks acak. Masukkan tujuan yang jelas dan bermakna."
  }
  return null
}

export default function WorkflowPage() {
  const { identity } = useAuth()
  const [objective, setObjective] = useState("")
  const [steps, setSteps] = useState<Step[]>(freshSteps())
  const [running, setRunning] = useState(false)
  const [error, setError] = useState("")

  const updateStep = (id: string, patch: Partial<Step>) =>
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))

  const resetAll = () => {
    if (running) return
    setObjective(""); setError(""); setSteps(freshSteps())
  }

  async function runWorkflow() {
    if (running || !identity) return
    const problem = validateObjective(objective)
    if (problem) { setError(problem); return }
    setError(""); setRunning(true)

    let updated = steps.map((s) => ({ ...s, status: "idle" as StepStatus, output: "" }))
    setSteps([...updated])

    let prevRole = ""
    let prevOutput = ""

    for (let i = 0; i < updated.length; i++) {
      updated = updated.map((s, idx) => (idx === i ? { ...s, status: "running" } : s))
      setSteps([...updated])

      const step = updated[i]
      const agent = AGENTS.find((a) => a.id === step.agentId)!
      let prompt = `Objective: ${objective}\n\nYour task: ${step.instruction}`
      if (prevOutput) prompt += `\n\nOutput from the previous step (${prevRole}):\n${prevOutput}`

      try {
        const res = await fetch("/api/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ persona: agent.persona, prompt }),
        }).then((r) => r.json())

        if (res?.error) {
          updated = updated.map((s, idx) => (idx === i ? { ...s, status: "error", output: res.error } : s))
          setSteps([...updated]); break
        }
        updated = updated.map((s, idx) => (idx === i ? { ...s, status: "done", output: res.output } : s))
        setSteps([...updated])
        prevRole = step.role
        prevOutput = res.output
      } catch {
        updated = updated.map((s, idx) => (idx === i ? { ...s, status: "error", output: "Network error." } : s))
        setSteps([...updated]); break
      }
    }
    setRunning(false)
  }

  const finalStep = steps[steps.length - 1]
  const finalReady = finalStep.status === "done"

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <div className="mb-8">
        <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-[#EAE1CE]"><Workflow className="h-4 w-4" /> Multi-Agent Workflow</p>
        <h1 className="text-2xl font-semibold text-[#F1EADD]">Chain agents into one pipeline</h1>
        <p className="mt-1 text-sm text-[#B2A693]">
          Each agent hands its output to the next via A2A — Research feeds Draft, Draft feeds Review — producing a single, refined deliverable.
        </p>
      </div>

      <div className="mb-6 rounded-2xl border border-[#2A2119] bg-[#16120D] p-6">
        <label className="mb-1.5 block text-xs text-[#B2A693]">Objective</label>
        <textarea value={objective} onChange={(e) => { setObjective(e.target.value); if (error) setError("") }} rows={2}
          placeholder="e.g. Create a launch announcement for Trocooony aimed at the Rialo community."
          className={`mb-2 w-full resize-none rounded-lg border bg-[#0B0906] px-3 py-2.5 text-sm text-[#F1EADD] outline-none placeholder:text-[#847668] ${error ? "border-[#FF6B6B]/60 focus:border-[#FF6B6B]" : "border-[#2A2119] focus:border-[#EAE1CE]/50"}`} />

        {error && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-[#FF6B6B]/30 bg-[#FF6B6B]/10 px-3 py-2 text-xs text-[#FF6B6B]">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {error}
          </div>
        )}

        {!identity && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-[#F5B759]/30 bg-[#F5B759]/10 px-3 py-2 text-xs text-[#F5B759]">
            <Lock className="h-3.5 w-3.5" /> Sign in to run a workflow.
          </div>
        )}

        <div className="mt-2 flex gap-2">
          <button onClick={runWorkflow} disabled={running || !objective.trim() || !identity}
            className="flex items-center justify-center gap-2 rounded-lg bg-[#EAE1CE] px-4 py-2.5 text-sm font-medium text-[#0D0A07] transition-colors hover:bg-[#F4EEDF] disabled:cursor-not-allowed disabled:opacity-40">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running ? "Running pipeline…" : "Run workflow"}
          </button>
          <button onClick={resetAll} disabled={running}
            className="flex items-center gap-1.5 rounded-lg border border-[#2A2119] px-3 py-2.5 text-sm text-[#B2A693] transition-colors hover:border-[#FF6B6B]/50 hover:text-[#FF6B6B] disabled:opacity-40">
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {steps.map((step, i) => (
          <div key={step.id}>
            <div className={`rounded-2xl border bg-[#16120D] p-5 transition-colors ${step.status === "running" ? "border-[#EAE1CE]/60" : "border-[#2A2119]"}`}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${step.status === "done" ? "bg-[#EAE1CE] text-[#0D0A07]" : step.status === "error" ? "bg-[#FF6B6B] text-white" : step.status === "running" ? "bg-[#EAE1CE]/20 text-[#EAE1CE]" : "bg-[#0B0906] text-[#847668]"}`}>
                    {step.status === "running" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : step.status === "done" ? <CheckCircle2 className="h-4 w-4" /> : step.status === "error" ? <XCircle className="h-4 w-4" /> : i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#F1EADD]">{step.role}</p>
                    <p className="text-[11px] text-[#847668]">Step {i + 1} of {steps.length}</p>
                  </div>
                </div>
                <select value={step.agentId} onChange={(e) => updateStep(step.id, { agentId: e.target.value })} disabled={running}
                  className="rounded-lg border border-[#2A2119] bg-[#0B0906] px-2.5 py-1.5 text-xs text-[#F1EADD] outline-none focus:border-[#EAE1CE]/50 disabled:opacity-50">
                  {AGENTS.map((a) => (<option key={a.id} value={a.id}>{a.name}</option>))}
                </select>
              </div>

              <textarea value={step.instruction} onChange={(e) => updateStep(step.id, { instruction: e.target.value })} rows={2} disabled={running}
                className="w-full resize-none rounded-lg border border-[#2A2119] bg-[#0B0906] px-3 py-2 text-xs text-[#B2A693] outline-none focus:border-[#EAE1CE]/50 disabled:opacity-60" />

              {step.output && (
                <div className={`mt-3 max-h-48 overflow-auto rounded-lg border p-3 text-sm whitespace-pre-wrap ${step.status === "error" ? "border-[#FF6B6B]/30 bg-[#FF6B6B]/5 text-[#FF6B6B]" : "border-[#2A2119] bg-[#0B0906] text-[#F1EADD]"}`}>
                  {step.output}
                </div>
              )}
            </div>

            {i < steps.length - 1 && (
              <div className="flex justify-center py-1 text-[#847668]"><ArrowDown className="h-4 w-4" /></div>
            )}
          </div>
        ))}
      </div>

      {finalReady && (
        <div className="mt-6 rounded-2xl border border-[#EAE1CE]/40 bg-[#EAE1CE]/5 p-6">
          <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-[#EAE1CE]"><Sparkles className="h-4 w-4" /> Final deliverable</p>
          <div className="max-h-80 overflow-auto whitespace-pre-wrap text-sm text-[#F1EADD]">{finalStep.output}</div>
        </div>
      )}
    </main>
  )
}

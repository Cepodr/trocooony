"use client"

import { useRef, useState } from "react"
import type { LucideIcon } from "lucide-react"
import {
  GraduationCap, Send, Loader2, Sparkles, ExternalLink, Bot, User,
  Globe, Cpu, Plug, Zap, Radio, Lock, Fuel, Wallet, Handshake, ShieldCheck, Coins, Wrench, Landmark, Rocket,
} from "lucide-react"
import { RIALO_KB } from "@/lib/rialo-knowledge"

type Msg = { role: "user" | "assistant"; content: string }

const ICONS: Record<string, LucideIcon> = {
  overview: Globe, vm: Cpu, web: Plug, reactive: Zap, stream: Radio, ipc: Lock,
  cruise: Fuel, omni: Wallet, scale: Handshake, harness: ShieldCheck, rlo: Coins,
  devtools: Wrench, ecosystem: Landmark, demos: Rocket,
}

const SUGGESTIONS = [
  "What makes Rialo different from other L1s?",
  "How do reactive transactions work?",
  "What is SCALE?",
  "What is the RLO token used for?",
]
const LINKS = [
  { label: "rialo.io", href: "https://rialo.io" },
  { label: "Docs", href: "https://rialo.io/docs" },
  { label: "Dev Portal", href: "https://rialo.io/for-devs" },
  { label: "Learn", href: "https://learn.rialo.io" },
  { label: "Playground", href: "https://playground.rialo.io" },
  { label: "GitHub", href: "https://github.com/rialo" },
]

export default function LearnPage() {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const scroller = useRef<HTMLDivElement>(null)

  async function ask(q: string) {
    const question = q.trim()
    if (!question || loading) return
    setError(""); setInput("")
    setMessages((m) => [...m, { role: "user", content: question }])
    setLoading(true)
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      }).then((r) => r.json())
      if (res?.error) { setError(res.error); setLoading(false); return }
      setMessages((m) => [...m, { role: "assistant", content: res.answer }])
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
      setTimeout(() => scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" }), 50)
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <div className="mb-8">
        <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-[#EAE1CE]"><GraduationCap className="h-4 w-4" /> Rialo Knowledge Base</p>
        <h1 className="text-2xl font-semibold text-[#F1EADD]">Learn Rialo, technology &amp; products</h1>
        <p className="mt-1 text-sm text-[#B2A693]">Everything Trocooony is built on, in one place, plus an AI guide that answers only from verified Rialo knowledge.</p>
      </div>

      <div className="mb-10 rounded-2xl border border-[#2A2119] bg-[#16120D] p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#F1EADD]"><Sparkles className="h-4 w-4 text-[#EAE1CE]" /> Ask Rialo</h2>

        <div ref={scroller} className="mb-4 max-h-80 space-y-3 overflow-auto">
          {messages.length === 0 && (
            <p className="flex items-center gap-2 text-sm text-[#847668]"><Bot className="h-4 w-4" /> Tanya apa saja tentang Rialo. Contoh di bawah.</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#EAE1CE]/15 text-[#EAE1CE]"><Bot className="h-3.5 w-3.5" /></span>}
              <div className={`max-w-[80%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${m.role === "user" ? "bg-[#EAE1CE] text-[#0D0A07]" : "border border-[#2A2119] bg-[#0B0906] text-[#F1EADD]"}`}>{m.content}</div>
              {m.role === "user" && <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#2A2119] text-[#B2A693]"><User className="h-3.5 w-3.5" /></span>}
            </div>
          ))}
          {loading && <div className="flex items-center gap-2 text-sm text-[#847668]"><Loader2 className="h-4 w-4 animate-spin" /> Rialo Guide sedang berpikir…</div>}
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => ask(s)} disabled={loading}
              className="rounded-full border border-[#2A2119] px-3 py-1 text-xs text-[#B2A693] transition-colors hover:border-[#EAE1CE]/50 hover:text-[#EAE1CE] disabled:opacity-40">{s}</button>
          ))}
        </div>

        <div className="flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") ask(input) }}
            placeholder="Tanya tentang Rialo…"
            className="flex-1 rounded-lg border border-[#2A2119] bg-[#0B0906] px-3 py-2.5 text-sm text-[#F1EADD] outline-none placeholder:text-[#847668] focus:border-[#EAE1CE]/50" />
          <button onClick={() => ask(input)} disabled={loading || !input.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-[#EAE1CE] px-4 py-2.5 text-sm font-medium text-[#0D0A07] hover:bg-[#F4EEDF] disabled:opacity-40">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Ask
          </button>
        </div>
        {error && <p className="mt-3 text-xs text-[#FF6B6B]">{error}</p>}
      </div>

      <h2 className="mb-3 text-sm font-semibold text-[#F1EADD]">Knowledge base</h2>
      <div className="mb-10 grid gap-4 md:grid-cols-2">
        {RIALO_KB.map((s) => {
          const Icon = ICONS[s.id] ?? Globe
          return (
            <div key={s.id} className="rounded-2xl border border-[#2A2119] bg-[#16120D] p-5">
              <div className="mb-2 flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#EAE1CE]/10 text-[#EAE1CE]"><Icon className="h-4 w-4" /></span>
                <h3 className="text-sm font-semibold text-[#F1EADD]">{s.title}</h3>
              </div>
              <p className="mb-3 text-sm text-[#B2A693]">{s.summary}</p>
              <ul className="space-y-1.5">
                {s.points.map((p, i) => (
                  <li key={i} className="flex gap-2 text-xs text-[#B2A693]"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#EAE1CE]" />{p}</li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <div className="rounded-2xl border border-[#2A2119] bg-[#16120D] p-6">
        <h2 className="mb-3 text-sm font-semibold text-[#F1EADD]">Official Rialo resources</h2>
        <div className="flex flex-wrap gap-2">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-lg border border-[#2A2119] px-3 py-1.5 text-sm text-[#B2A693] hover:border-[#EAE1CE]/50 hover:text-[#EAE1CE]">
              {l.label} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ))}
        </div>
      </div>
    </main>
  )
}

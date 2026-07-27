import { NextResponse } from "next/server"
import OpenAI from "openai"

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || "missing",
  baseURL: "https://api.groq.com/openai/v1",
})

const MODEL = "llama-3.3-70b-versatile"

const RIALO_CONTEXT = `DOMAIN CONTEXT, Rialo is a Layer-1 (L1) BLOCKCHAIN built by Subzero Labs. It is NOT the California city "Rialto" and NOT the Rialto Bridge in Venice. Whenever a task says "Rialo" it always means this blockchain; never substitute or rename it to "Rialto". Verified facts: slogan "Rethink. Rebuild. Rialo."; RISC-V + SVM execution; runtime REX inside a TEE; native webcalls; native timers; Rialo Stream; SCALE = Simple Contracts for Agent Labor Execution; a ~$20M seed round in Aug 2025 led by Pantera Capital. If you lack real news about Rialo, do NOT invent events, places, or announcements, write accurate content grounded only in these facts. Never use em dashes in your output; use commas, colons, or separate sentences.`

// Auditable rubric: each dimension scored 0-100, combined by weight.
const RUBRIC = [
  { key: "correctness", label: "Correctness", weight: 0.3, guide: "Are the facts, logic, and claims accurate with no errors or hallucinations?" },
  { key: "completeness", label: "Completeness", weight: 0.25, guide: "Does it fully address every part of the task, leaving nothing important out?" },
  { key: "usefulness", label: "Usefulness", weight: 0.2, guide: "Is it genuinely actionable and valuable to the requester?" },
  { key: "clarity", label: "Clarity & Structure", weight: 0.15, guide: "Is it well-organized, readable, and unambiguous?" },
  { key: "criteria", label: "Criteria Adherence", weight: 0.1, guide: "Does it satisfy the specific QUALITY CRITERIA provided?" },
]

export async function POST(req: Request) {
  try {
    const key = process.env.GROQ_API_KEY
    if (!key || key.includes("xxxx") || key.includes("TEMPEL")) {
      return NextResponse.json({ error: "GROQ_API_KEY is not set in .env.local." }, { status: 400 })
    }

    const body = await req.json()
    const prompt: string = (body.prompt || "").toString()
    const criteria: string = (body.criteria || "Clear, correct, and genuinely useful.").toString()
    const persona: string = (body.persona || "You are a helpful, high-quality AI worker agent.").toString()

    if (!prompt.trim()) {
      return NextResponse.json({ error: "Task prompt kosong." }, { status: 400 })
    }

    // 1) Worker agent, receives the SCALE task via A2A dispatch
    const workerRes = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.6,
      messages: [
        { role: "system", content: persona + "\n\n" + RIALO_CONTEXT },
        { role: "user", content: prompt },
      ],
    })
    const output = workerRes.choices[0]?.message?.content?.trim() || ""

    // 2) Judge agent, multi-dimensional, auditable rubric
    const rubricText = RUBRIC.map(
      (r) => `- ${r.key} ("${r.label}", weight ${Math.round(r.weight * 100)}%): ${r.guide}`
    ).join("\n")

    const judgeSystem =
        RIALO_CONTEXT + "\n\n" +
        "Apply the Rialo context above. If the WORKER OUTPUT confuses Rialo with the city Rialto or the Rialto Bridge, or fabricates fake news, events, or places, that is a SEVERE factual error: score correctness below 30, add a flag, and the task must FAIL. " +
      "You are a strict, fair quality-assurance Judge agent in the SCALE protocol. " +
      "Grade the WORKER OUTPUT against the TASK and QUALITY CRITERIA using the RUBRIC. " +
      "Grade fairly and rigorously, never pedantically. Score each rubric dimension 0-100 using this calibration: 85-100 excellent, 70-84 solid and acceptable, 50-69 mediocre, below 50 poor. A competent answer that genuinely fulfils the task should land around 70-85 or higher. " +
      "Do NOT penalize tone, writing style, or language unless the QUALITY CRITERIA explicitly require it. " +
      "For each dimension give a short, specific note citing evidence from the output. " +
      "Only flag GENUINE problems: real factual errors, hallucinations, or clearly missing requirements. Do not invent nitpicks. " +
      "Reply with STRICT JSON ONLY, no markdown, in exactly this shape: " +
      '{"dimensions":{"correctness":{"score":0,"note":""},"completeness":{"score":0,"note":""},"usefulness":{"score":0,"note":""},"clarity":{"score":0,"note":""},"criteria":{"score":0,"note":""}},"flags":[],"summary":""}'

    const judgeRes = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0,
      messages: [
        { role: "system", content: judgeSystem },
        {
          role: "user",
          content:
            "TASK:\n" + prompt +
            "\n\nQUALITY CRITERIA:\n" + criteria +
            "\n\nRUBRIC:\n" + rubricText +
            "\n\nWORKER OUTPUT:\n" + output,
        },
      ],
    })

    const rawJudge = judgeRes.choices[0]?.message?.content || ""
    const match = rawJudge.match(/\{[\s\S]*\}/)

    let breakdown = RUBRIC.map((r) => ({ key: r.key, label: r.label, weight: r.weight, score: 0, note: "" }))
    let flags: string[] = []
    let summary = "Judge could not parse a verdict."
    let parsedOk = false

    if (match) {
      try {
        const parsed = JSON.parse(match[0])
        const dims = parsed.dimensions || {}
        breakdown = RUBRIC.map((r) => {
          const d = dims[r.key] || {}
          const s = Math.max(0, Math.min(100, Math.round(Number(d.score) || 0)))
          return { key: r.key, label: r.label, weight: r.weight, score: s, note: String(d.note || "").slice(0, 200) }
        })
        if (Array.isArray(parsed.flags)) flags = parsed.flags.map((f: unknown) => String(f)).slice(0, 8)
        summary = String(parsed.summary || summary).slice(0, 300)
        parsedOk = true
      } catch {}
    }

    // Auditable overall score = weighted sum of dimension scores
    const overall = parsedOk
      ? Math.round(breakdown.reduce((sum, d) => sum + d.score * d.weight, 0))
      : 0

    // Hard gate: every core dimension must clear a floor, else auto-FAIL
    const PASS_THRESHOLD = 70
    const DIM_FLOOR = 35
    const CORE = ["correctness", "completeness"]
    const coreBelowFloor = breakdown.some((d) => CORE.includes(d.key) && d.score < DIM_FLOOR)
    const verdict = overall >= PASS_THRESHOLD && !coreBelowFloor ? "PASS" : "FAIL"

    return NextResponse.json({
      output,
      score: overall,
      reason: summary,
      verdict,
      breakdown,
      flags,
      threshold: PASS_THRESHOLD,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 })
  }
}

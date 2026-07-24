import { NextResponse } from "next/server"
import OpenAI from "openai"

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || "missing",
  baseURL: "https://api.groq.com/openai/v1",
})

const MODEL = "llama-3.3-70b-versatile"

export async function POST(req: Request) {
  try {
    const key = process.env.GROQ_API_KEY
    if (!key || key.includes("xxxx") || key.includes("TEMPEL")) {
      return NextResponse.json({ error: "GROQ_API_KEY belum diisi di .env.local." }, { status: 400 })
    }

    const body = await req.json()
    const prompt: string = (body.prompt || "").toString()
    const criteria: string = (body.criteria || "Clear, correct, and genuinely useful.").toString()
    const persona: string = (body.persona || "You are a helpful, high-quality AI worker agent.").toString()

    if (!prompt.trim()) {
      return NextResponse.json({ error: "Task prompt kosong." }, { status: 400 })
    }

    // 1) Worker agent — receives the SCALE task via A2A dispatch
    const workerRes = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.6,
      messages: [
        { role: "system", content: persona },
        { role: "user", content: prompt },
      ],
    })
    const output = workerRes.choices[0]?.message?.content?.trim() || ""

    // 2) Judge agent — quality assurance via native webcall
    const judgeRes = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0,
      messages: [
        {
          role: "system",
          content:
            "You are a strict quality-assurance Judge agent in the SCALE protocol. " +
            "Evaluate whether the WORKER OUTPUT fulfils the TASK and the QUALITY CRITERIA. " +
            'Reply with STRICT JSON ONLY: {"score": <integer 0-100>, "reason": "<one concise sentence>"}.',
        },
        {
          role: "user",
          content:
            "TASK:\n" + prompt + "\n\nQUALITY CRITERIA:\n" + criteria + "\n\nWORKER OUTPUT:\n" + output,
        },
      ],
    })
    const raw = judgeRes.choices[0]?.message?.content || ""
    const match = raw.match(/\{[\s\S]*\}/)
    let score = 0
    let reason = "Judge could not parse a verdict."
    if (match) {
      try {
        const parsed = JSON.parse(match[0])
        score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)))
        reason = String(parsed.reason || reason)
      } catch {}
    }
    const verdict = score >= 70 ? "PASS" : "FAIL"

    return NextResponse.json({ output, score, reason, verdict })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 })
  }
}

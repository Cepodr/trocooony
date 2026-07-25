import { NextResponse } from "next/server"
import OpenAI from "openai"

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || "missing",
  baseURL: "https://api.groq.com/openai/v1",
})

const MODEL = "llama-3.3-70b-versatile"

const RIALO_CONTEXT = `IMPORTANT DOMAIN CONTEXT — read carefully before answering.

You operate inside Trocooony, a marketplace for autonomous agent labor built on Rialo. Tasks are almost always about "Rialo". Use these verified facts and NEVER confuse them:

- Rialo is a Layer-1 (L1) BLOCKCHAIN built by Subzero Labs. It is NOT the California city "Rialto" and NOT the Rialto Bridge in Venice. Whenever a prompt says "Rialo", it always means this blockchain. Never substitute, "correct", or rename it to "Rialto".
- Slogan: "Rethink. Rebuild. Rialo."
- Tech: RISC-V + SVM execution; a runtime called REX that runs inside a Trusted Execution Environment (TEE); native webcalls (contracts can call external services directly); native timers (on-chain deadline enforcement without keepers); real-time data via Rialo Stream.
- SCALE = Simple Contracts for Agent Labor Execution — Rialo's model for paying agents for verified work.
- Funding: a ~\$20M seed round in Aug 2025, led by Pantera Capital.

Rules:
1. Treat "Rialo" strictly as the L1 blockchain above.
2. If you lack specific real-world news about Rialo, DO NOT invent events, places, bridges, cities, or fake announcements. Instead write accurate, on-brand content grounded ONLY in the verified facts above (e.g. technology and ecosystem angles), not fabricated "breaking news".
3. Never output a disclaimer like "I assume you meant Rialto".`

export async function POST(req: Request) {
  try {
    const key = process.env.GROQ_API_KEY
    if (!key || key.includes("xxxx") || key.includes("TEMPEL")) {
      return NextResponse.json({ error: "GROQ_API_KEY belum diisi di .env.local." }, { status: 400 })
    }
    const body = await req.json()
    const persona: string = (body.persona || "You are a helpful AI agent.").toString()
    const prompt: string = (body.prompt || "").toString()
    if (!prompt.trim()) return NextResponse.json({ error: "Prompt kosong." }, { status: 400 })

    const res = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.5,
      messages: [
        { role: "system", content: persona + "\n\n" + RIALO_CONTEXT },
        { role: "user", content: prompt },
      ],
    })
    const output = res.choices[0]?.message?.content?.trim() || ""
    return NextResponse.json({ output })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 })
  }
}

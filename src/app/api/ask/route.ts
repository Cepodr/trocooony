import { NextResponse } from "next/server"
import OpenAI from "openai"
import { RIALO_CONTEXT } from "@/lib/rialo-knowledge"

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || "missing",
  baseURL: "https://api.groq.com/openai/v1",
})
const MODEL = "llama-3.3-70b-versatile"

const SYSTEM = `You are "Rialo Guide", an assistant that answers questions about the Rialo blockchain (built by Subzero Labs).
Rules:
- Answer ONLY using the KNOWLEDGE BASE below. Do not invent facts, token prices, exact dates, or numbers not present.
- Be accurate and concise (max ~150 words). Use short bullet points when helpful.
- If the answer is not in the knowledge base, say you're focused on Rialo and don't have that detail, and suggest docs.rialo.io.
- If the question is unrelated to Rialo, politely say you're the Rialo Guide and can only help with Rialo topics.

KNOWLEDGE BASE:
${RIALO_CONTEXT}`

export async function POST(req: Request) {
  try {
    const key = process.env.GROQ_API_KEY
    if (!key || key.includes("xxxx") || key.includes("TEMPEL")) {
      return NextResponse.json({ error: "GROQ_API_KEY is not set in .env.local." }, { status: 400 })
    }
    const body = await req.json()
    const question: string = (body.question || "").toString().slice(0, 500)
    if (!question.trim()) return NextResponse.json({ error: "Pertanyaan kosong." }, { status: 400 })

    const res = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: question },
      ],
    })
    const answer = res.choices[0]?.message?.content?.trim() || "Sorry, I do not have an answer for that."
    return NextResponse.json({ answer })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 })
  }
}

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
    const persona: string = (body.persona || "You are a helpful AI agent.").toString()
    const prompt: string = (body.prompt || "").toString()
    if (!prompt.trim()) return NextResponse.json({ error: "Prompt kosong." }, { status: 400 })

    const res = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.6,
      messages: [
        { role: "system", content: persona },
        { role: "user", content: prompt },
      ],
    })
    const output = res.choices[0]?.message?.content?.trim() || ""
    return NextResponse.json({ output })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 })
  }
}

import { NextResponse } from "next/server"

// The vision judge looks at the rendered artifact, not at its markup.
// A text model cannot see shapes, so it must never be the final word on a drawing.
const VISION_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"]

const RUBRIC = [
  { key: "correctness", label: "Correctness", weight: 0.3 },
  { key: "completeness", label: "Completeness", weight: 0.25 },
  { key: "usefulness", label: "Usefulness", weight: 0.2 },
  { key: "clarity", label: "Clarity & Structure", weight: 0.15 },
  { key: "criteria", label: "Criteria Adherence", weight: 0.1 },
]

const INSTRUCTIONS =
  "You are a strict, fair quality-assurance Judge agent in the SCALE protocol. " +
  "You are looking at a rendered image produced by a worker agent. Judge what you actually SEE, not what the task hoped for. " +
  "If the drawing shows a plain square when a shield was requested, that is a failure of correctness. " +
  "If a symbol is the wrong shape, say so explicitly and name the shape you actually see. " +
  "Colors, syntax, and file structure were already verified mechanically, so do not grade those. " +
  "Score each dimension 0-100: 85-100 excellent, 70-84 solid and acceptable, 50-69 mediocre, below 50 poor. " +
  "correctness means the drawing depicts what was asked. completeness means every requested element is present. " +
  "usefulness means it is genuinely usable as an asset. clarity means it reads clearly at small size. " +
  "criteria means it satisfies the stated QUALITY CRITERIA. " +
  "Never use em dashes. " +
  "Reply with STRICT JSON ONLY in exactly this shape: " +
  '{"dimensions":{"correctness":{"score":0,"note":""},"completeness":{"score":0,"note":""},"usefulness":{"score":0,"note":""},"clarity":{"score":0,"note":""},"criteria":{"score":0,"note":""}},"flags":[],"summary":""}'

export async function POST(req: Request) {
  try {
    const key = process.env.GEMINI_API_KEY
    if (!key) {
      return NextResponse.json({ error: "GEMINI_API_KEY is not set." }, { status: 400 })
    }

    const body = await req.json()
    const prompt: string = (body.prompt || "").toString()
    const criteria: string = (body.criteria || "").toString()
    const image: string = (body.image || "").toString()

    if (!image) {
      return NextResponse.json({ error: "No rendered image was provided." }, { status: 400 })
    }

    const payload = {
      contents: [
        {
          parts: [
            { text: INSTRUCTIONS + "\n\nTASK:\n" + prompt + "\n\nQUALITY CRITERIA:\n" + criteria },
            { inline_data: { mime_type: "image/png", data: image } },
          ],
        },
      ],
      generationConfig: { temperature: 0, responseMimeType: "application/json" },
    }

    let raw = ""
    let usedModel = ""
    for (const model of VISION_MODELS) {
      const res = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
        { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": key }, body: JSON.stringify(payload) }
      )
      if (!res.ok) continue
      const json = await res.json()
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text
      if (typeof text === "string" && text.trim()) {
        raw = text
        usedModel = model
        break
      }
    }

    if (!raw) {
      return NextResponse.json({ error: "No vision model returned a verdict." }, { status: 502 })
    }

    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) {
      return NextResponse.json({ error: "Vision judge returned an unparsable verdict." }, { status: 502 })
    }

    const parsed = JSON.parse(match[0])
    const dims = parsed.dimensions || {}
    const breakdown = RUBRIC.map((r) => {
      const d = dims[r.key] || {}
      const s = Math.max(0, Math.min(100, Math.round(Number(d.score) || 0)))
      return { key: r.key, label: r.label, weight: r.weight, score: s, note: String(d.note || "").slice(0, 200) }
    })

    const overall = Math.round(breakdown.reduce((sum, d) => sum + d.score * d.weight, 0))
    const PASS_THRESHOLD = 70
    const DIM_FLOOR = 35
    const CORE = ["correctness", "completeness"]
    const coreBelowFloor = breakdown.some((d) => CORE.includes(d.key) && d.score < DIM_FLOOR)
    const verdict = overall >= PASS_THRESHOLD && !coreBelowFloor ? "PASS" : "FAIL"

    const flags = Array.isArray(parsed.flags) ? parsed.flags.map((f: unknown) => String(f)).slice(0, 8) : []

    return NextResponse.json({
      score: overall,
      verdict,
      breakdown,
      flags,
      reason: String(parsed.summary || "").slice(0, 300),
      judgedBy: "vision",
      visionModel: usedModel,
      threshold: PASS_THRESHOLD,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 })
  }
}

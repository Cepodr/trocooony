import { NextResponse } from "next/server"
import OpenAI from "openai"

const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY || "missing",
  baseURL: "https://api.groq.com/openai/v1",
})

const MODEL = "llama-3.3-70b-versatile"

const RIALO_CONTEXT = `DOMAIN CONTEXT, Rialo is a Layer-1 (L1) BLOCKCHAIN built by Subzero Labs. It is NOT the California city "Rialto" and NOT the Rialto Bridge in Venice. Whenever a task says "Rialo" it always means this blockchain; never substitute or rename it to "Rialto". Verified facts: slogan "Rethink. Rebuild. Rialo."; RISC-V + SVM execution; runtime REX inside a TEE; native webcalls; native timers; Rialo Stream; SCALE = Simple Contracts for Agent Labor Execution; a ~$20M seed round in Aug 2025 led by Pantera Capital. If you lack real news about Rialo, do NOT invent events, places, or announcements, write accurate content grounded only in these facts. Never use em dashes in your output; use commas, colons, or separate sentences.`

const RUBRIC = [
  { key: "correctness", label: "Correctness", weight: 0.3, guide: "Are the facts, logic, and claims accurate with no errors or hallucinations?" },
  { key: "completeness", label: "Completeness", weight: 0.25, guide: "Does it fully address every part of the task, leaving nothing important out?" },
  { key: "usefulness", label: "Usefulness", weight: 0.2, guide: "Is it genuinely actionable and valuable to the requester?" },
  { key: "clarity", label: "Clarity & Structure", weight: 0.15, guide: "Is it well-organized, readable, and unambiguous?" },
  { key: "criteria", label: "Criteria Adherence", weight: 0.1, guide: "Does it satisfy the specific QUALITY CRITERIA provided?" },
]

const SVG_MAX_CHARS = 20000
const FORBIDDEN = ["<image", "<script", "<foreignobject", "<iframe", "data:image", "xlink:href=\"http"]

const SVG_RULES =
  "OUTPUT FORMAT, you must reply with one self contained SVG document and nothing else. " +
  "No markdown fences, no explanation, no commentary before or after. " +
  "Start with an svg tag, include a viewBox attribute, and close every element. " +
  "Use only vector elements: path, rect, circle, ellipse, line, polygon, polyline, g, defs, linearGradient, radialGradient, text. " +
  "Never include raster images, base64 data, script tags, foreignObject, iframes, or remote urls. " +
  "Keep the markup under " + SVG_MAX_CHARS + " characters. " +
  "If the task or criteria name specific hex colors, use only those colors."

const NAMED_HEX: Record<string, string> = {
  red: "#ff0000", crimson: "#dc143c", orange: "#ffa500", gold: "#ffd700", yellow: "#ffff00",
  lime: "#00ff00", green: "#008000", teal: "#008080", cyan: "#00ffff", blue: "#0000ff",
  navy: "#000080", purple: "#800080", violet: "#ee82ee", magenta: "#ff00ff", pink: "#ffc0cb",
  brown: "#a52a2a", cream: "#fffdd0", black: "#000000", white: "#ffffff", gray: "#808080",
  grey: "#808080", silver: "#c0c0c0",
}

const HUE_RANGES: Record<string, Array<[number, number]>> = {
  red: [[345, 360], [0, 12]], crimson: [[335, 360], [0, 10]], orange: [[13, 45]],
  gold: [[38, 60]], yellow: [[45, 70]], lime: [[71, 110]], green: [[71, 165]],
  teal: [[166, 200]], cyan: [[166, 200]], blue: [[196, 255]], navy: [[196, 255]],
  purple: [[256, 300]], violet: [[256, 305]], magenta: [[291, 335]], pink: [[295, 350]],
}

function toHsl(hex: string): { h: number; s: number; l: number } | null {
  let h = hex.replace("#", "").toLowerCase()
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  if (h.length === 8) h = h.slice(0, 6)
  if (h.length !== 6 || /[^0-9a-f]/.test(h)) return null
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  const l = (max + min) / 2
  let hue = 0
  if (d !== 0) {
    if (max === r) hue = ((g - b) / d) % 6
    else if (max === g) hue = (b - r) / d + 2
    else hue = (r - g) / d + 4
    hue = hue * 60
    if (hue < 0) hue += 360
  }
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1))
  return { h: hue, s: sat * 100, l: l * 100 }
}

function matchesColorName(hex: string, name: string): boolean {
  const c = toHsl(hex)
  if (!c) return false
  if (name === "black") return c.l <= 16
  if (name === "white") return c.l >= 90 && c.s <= 20
  if (name === "gray" || name === "grey" || name === "silver") return c.s <= 14 && c.l > 16 && c.l < 90
  if (name === "cream") return c.l >= 82 && c.h >= 30 && c.h <= 70
  if (name === "brown") return c.h >= 10 && c.h <= 45 && c.l < 46 && c.s >= 15
  const ranges = HUE_RANGES[name]
  if (!ranges) return false
  if (c.s < 15 || c.l < 12 || c.l > 93) return false
  return ranges.some(([a, b]) => c.h >= a && c.h <= b)
}
type Check = { label: string; ok: boolean; detail: string }

function stripFence(input: string): string {
  let t = (input || "").trim()
  if (t.startsWith("```")) {
    t = t.replace(/^```[a-zA-Z]*\s*/, "").replace(/```\s*$/, "").trim()
  }
  const i = t.indexOf("<svg")
  const j = t.lastIndexOf("</svg>")
  if (i >= 0 && j > i) t = t.slice(i, j + 6)
  return t.trim()
}

function checkSvg(raw: string, criteria: string) {
  const svg = stripFence(raw)
  const lower = svg.toLowerCase()
  const checks: Check[] = []
  const add = (label: string, ok: boolean, detail: string) => { checks.push({ label, ok, detail }) }

  add("Is SVG markup", lower.startsWith("<svg") && lower.includes("</svg>"), "The output must be a single svg document.")
  add("Has viewBox", /viewbox\s*=/.test(lower), "A viewBox is required so the drawing scales cleanly.")

  const opened = (svg.match(/<[a-zA-Z]/g) || []).length
  const closed = (svg.match(/<\//g) || []).length + (svg.match(/\/>/g) || []).length
  add("Elements closed", opened > 0 && closed >= opened - 1, "Every element must be closed.")

  const bad = FORBIDDEN.filter((f) => lower.includes(f))
  add("Self contained", bad.length === 0, bad.length ? "Forbidden content found: " + bad.join(", ") : "No raster images, scripts, or remote references.")

  add("Within size limit", svg.length > 0 && svg.length <= SVG_MAX_CHARS, "Markup is " + svg.length + " characters, the limit is " + SVG_MAX_CHARS + ".")

  const used = Array.from(new Set((svg.match(/#[0-9a-fA-F]{3,8}/g) || []).map((c) => c.toLowerCase())))
  const wanted = Array.from(new Set((criteria.match(/#[0-9a-fA-F]{3,8}/g) || []).map((c) => c.toLowerCase())))
  if (wanted.length > 0) {
    const extra = used.filter((c) => !wanted.includes(c))
    add("Palette respected", extra.length === 0, extra.length ? "Colors outside the requested palette: " + extra.join(", ") : "Only the requested colors are used.")
  }

  add("No event handlers", !/\son[a-z]+\s*=/i.test(svg), "Inline event handlers are not allowed inside the artifact.")

  const namedWanted = Object.keys(NAMED_HEX).filter((n) => new RegExp("\\b" + n + "\\b", "i").test(criteria))
  if (namedWanted.length > 0) {
    const literal = (svg.match(/(?:fill|stroke|stop-color)\s*=\s*"([a-zA-Z]+)"/g) || [])
      .map((m) => (m.split("\"")[1] || "").toLowerCase())
      .map((n) => NAMED_HEX[n])
      .filter(Boolean) as string[]
    const palette = Array.from(new Set(used.concat(literal)))
    for (const name of namedWanted) {
      const hit = palette.some((hex) => matchesColorName(hex, name))
      add(
        "Uses " + name,
        hit,
        hit
          ? "The drawing contains a " + name + " tone."
          : "The criteria asked for " + name + ", but no shape in the drawing is " + name + ". Colors found: " + (palette.join(", ") || "none") + "."
      )
    }
  }
  return { svg, checks, passed: checks.every((c) => c.ok) }
}

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

    // The artifact type comes from the task, not from who performs it.
    const VISUAL_TASK = /\b(svg|draw|drawing|icon|logo|illustration|illustrate|diagram|chart|wireframe|badge|emblem)\b/i
    const svgMode =
      body.mode === "svg" ||
      VISUAL_TASK.test(prompt) ||
      VISUAL_TASK.test(criteria)

    const workerRes = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.6,
      messages: [
        { role: "system", content: persona + "\n\n" + RIALO_CONTEXT + (svgMode ? "\n\n" + SVG_RULES : "") },
        { role: "user", content: prompt },
      ],
    })
    const rawOutput = workerRes.choices[0]?.message?.content?.trim() || ""

    let output = rawOutput
    let checks: Check[] = []

    if (svgMode) {
      const v = checkSvg(rawOutput, criteria)
      output = v.svg || rawOutput
      checks = v.checks
      if (!v.passed) {
        const failed = v.checks.filter((c) => !c.ok)
        return NextResponse.json({
          output,
          outputType: "svg",
          checks,
          judged: false,
          score: 0,
          reason: "Mechanical validation failed before judging: " + failed.map((c) => c.label).join(", ") + ". No judge was called, so this verdict is fully reproducible.",
          verdict: "FAIL",
          breakdown: RUBRIC.map((r) => ({ key: r.key, label: r.label, weight: r.weight, score: 0, note: "Not judged, the artifact failed mechanical validation." })),
          flags: failed.map((c) => c.label + ": " + c.detail),
          threshold: 70,
        })
      }
    }

    const rubricText = RUBRIC.map(
      (r) => "- " + r.key + " (\"" + r.label + "\", weight " + Math.round(r.weight * 100) + "%): " + r.guide
    ).join("\n")

    const judgeSystem =
      RIALO_CONTEXT + "\n\n" +
      "Apply the Rialo context above. If the WORKER OUTPUT confuses Rialo with the city Rialto or the Rialto Bridge, or fabricates fake news, events, or places, that is a SEVERE factual error: score correctness below 30, add a flag, and the task must FAIL. " +
      "Named evidence is held to the same standard. If the output cites papers, articles, authors, publication years, statistics, or URLs that cannot be verified from the Rialo context above or from well-established public knowledge, treat each unverifiable citation as a fabrication: score correctness below 30, add a flag naming the invented source, and the task must FAIL. " +
      "Satisfying a requirement by inventing evidence is never acceptable. A well-formatted answer built on sources that do not exist is worse than an answer that admits it has no sources. " +
      (svgMode
        ? "The WORKER OUTPUT is SVG vector markup that has already passed mechanical validation for syntax, viewBox, self containment, size, and palette. Do NOT re-check syntax and do NOT grade beauty or personal taste. Grade only whether the drawing depicts what the TASK asked for and satisfies the QUALITY CRITERIA. Read the shapes, colors, and structure of the markup to decide what it depicts. "
        : "") +
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

    if (!parsedOk) {
      try {
        const repair = await groq.chat.completions.create({
          model: MODEL,
          temperature: 0,
          messages: [
            { role: "system", content: "Convert the quality report below into STRICT JSON ONLY, no markdown and no commentary. Use a dimensions object holding correctness, completeness, usefulness, clarity and criteria, where each one is an object with a numeric score from 0 to 100 and a short note string. Add a flags array of strings and a summary string. Preserve the judgement faithfully and invent nothing." },
            { role: "user", content: rawJudge || "No report was produced." },
          ],
        })
        const rawRepair = repair.choices[0]?.message?.content || ""
        const m2 = rawRepair.match(/\{[\s\S]*\}/)
        if (m2) {
          const parsed2 = JSON.parse(m2[0])
          const dims2 = parsed2.dimensions || {}
          breakdown = RUBRIC.map((r) => {
            const d = dims2[r.key] || {}
            const sc = Math.max(0, Math.min(100, Math.round(Number(d.score) || 0)))
            return { key: r.key, label: r.label, weight: r.weight, score: sc, note: String(d.note || "").slice(0, 200) }
          })
          if (Array.isArray(parsed2.flags)) flags = parsed2.flags.map((f: unknown) => String(f)).slice(0, 8)
          summary = String(parsed2.summary || summary).slice(0, 300)
          parsedOk = true
        }
      } catch {}
    }

    if (!parsedOk) {
      return NextResponse.json({
        error: "The judge agent malfunctioned and returned no readable verdict. No quality judgement was made, so this task must not be settled as a failure.",
        judgeError: true,
      }, { status: 502 })
    }

    const overall = parsedOk
      ? Math.round(breakdown.reduce((sum, d) => sum + d.score * d.weight, 0))
      : 0

    const PASS_THRESHOLD = 70
    const DIM_FLOOR = 35
    const CORE = ["correctness", "completeness"]
    const coreBelowFloor = breakdown.some((d) => CORE.includes(d.key) && d.score < DIM_FLOOR)
    const verdict = overall >= PASS_THRESHOLD && !coreBelowFloor ? "PASS" : "FAIL"

    return NextResponse.json({
      output,
      outputType: svgMode ? "svg" : "text",
      checks,
      judged: true,
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

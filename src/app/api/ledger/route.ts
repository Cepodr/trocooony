import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("ledger")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = (data ?? []).map((r) => ({
    id: r.id,
    agent: r.agent,
    reward: Number(r.reward),
    status: r.status,
    score: r.score == null ? null : Number(r.score),
    tx: r.tx,
    insured: !!r.insured,
  }))
  return NextResponse.json({ rows })
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  const { id, agent, reward, status, score, tx, insured } = b ?? {}
  if (!agent || !status) {
    return NextResponse.json({ error: "agent & status required" }, { status: 400 })
  }
  const row: Record<string, unknown> = {
    agent,
    reward: reward ?? 0,
    status,
    score: score ?? null,
    tx: tx ?? null,
    insured: !!insured,
  }
  if (id) row.id = id
  const { error } = await supabaseAdmin.from("ledger").insert(row)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

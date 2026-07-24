import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("reputation_outcomes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1000)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const outcomes = (data ?? []).map((r) => ({
    agentId: r.agent_id,
    agentName: r.agent_name,
    result: r.result,
    score: r.score == null ? null : Number(r.score),
    reward: Number(r.reward),
    ts: new Date(r.created_at).getTime(),
  }))
  return NextResponse.json({ outcomes })
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  const { agentId, agentName, result, score, reward } = b ?? {}
  if (!agentId || !agentName || !result) {
    return NextResponse.json({ error: "agentId, agentName, result required" }, { status: 400 })
  }
  const { error } = await supabaseAdmin.from("reputation_outcomes").insert({
    agent_id: agentId,
    agent_name: agentName,
    result,
    score: score ?? null,
    reward: reward ?? 0,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  const { error } = await supabaseAdmin
    .from("reputation_outcomes")
    .delete()
    .not("id", "is", null)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tasks: data ?? [] })
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  const { objective, reward, deadline, worker_agent, created_by } = b ?? {}
  if (!objective || reward == null) {
    return NextResponse.json({ error: "objective & reward required" }, { status: 400 })
  }
  const { data, error } = await supabaseAdmin
    .from("tasks")
    .insert({
      objective,
      reward,
      deadline: deadline ?? null,
      worker_agent: worker_agent ?? null,
      created_by: created_by ?? null,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ task: data })
}

export async function PATCH(req: Request) {
  const b = await req.json().catch(() => ({}))
  const { id, status, judge_score } = b ?? {}
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  const patch: Record<string, unknown> = {}
  if (status != null) patch.status = status
  if (judge_score != null) patch.judge_score = judge_score
  const { error } = await supabaseAdmin.from("tasks").update(patch).eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

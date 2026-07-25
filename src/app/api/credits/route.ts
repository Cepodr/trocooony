import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const GRANT = 300

async function getOrCreate(user: string): Promise<number> {
  const { data } = await supabaseAdmin.from("credits").select("balance").eq("user_id", user).maybeSingle()
  if (data) return Number(data.balance)
  await supabaseAdmin.from("credits").insert({ user_id: user, balance: GRANT })
  return GRANT
}

export async function GET(req: Request) {
  const user = new URL(req.url).searchParams.get("user")
  if (!user) return NextResponse.json({ error: "user required" }, { status: 400 })
  try {
    const balance = await getOrCreate(user)
    return NextResponse.json({ balance })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  const { user, delta } = b ?? {}
  if (!user || typeof delta !== "number") {
    return NextResponse.json({ error: "user, delta required" }, { status: 400 })
  }
  try {
    const current = await getOrCreate(user)
    const next = current + delta
    if (next < 0) return NextResponse.json({ error: "Saldo RLO tidak cukup." }, { status: 400 })
    const { error } = await supabaseAdmin
      .from("credits")
      .update({ balance: next, updated_at: new Date().toISOString() })
      .eq("user_id", user)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ balance: next })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "error" }, { status: 500 })
  }
}

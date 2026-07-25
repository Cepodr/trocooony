import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const GRANT = 300

type Balances = { rlo: number; trlo: number }

async function getOrCreate(user: string): Promise<Balances> {
  const { data } = await supabaseAdmin
    .from("credits").select("balance, trlo").eq("user_id", user).maybeSingle()
  if (data) return { rlo: Number(data.balance), trlo: Number((data as any).trlo ?? 0) }
  await supabaseAdmin.from("credits").insert({ user_id: user, balance: GRANT, trlo: 0 })
  return { rlo: GRANT, trlo: 0 }
}

async function save(user: string, b: Balances) {
  return (await supabaseAdmin.from("credits")
    .update({ balance: b.rlo, trlo: b.trlo, updated_at: new Date().toISOString() })
    .eq("user_id", user)).error
}

export async function GET(req: Request) {
  const user = new URL(req.url).searchParams.get("user")
  if (!user) return NextResponse.json({ error: "user required" }, { status: 400 })
  try {
    const b = await getOrCreate(user)
    return NextResponse.json({ rlo: b.rlo, trlo: b.trlo, balance: b.rlo })
  } catch (e: any) { return NextResponse.json({ error: e?.message || "error" }, { status: 500 }) }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const user = body?.user, action = body?.action
  const amount = Math.abs(Number(body?.amount ?? 0))
  if (!user || !action) return NextResponse.json({ error: "user, action required" }, { status: 400 })
  if (!amount || amount <= 0) return NextResponse.json({ error: "amount tidak valid." }, { status: 400 })
  try {
    const b = await getOrCreate(user)
    if (action === "deposit") {
      if (b.rlo < amount) return NextResponse.json({ error: "Saldo RLO tidak cukup." }, { status: 400 })
      b.rlo -= amount; b.trlo += amount
    } else if (action === "withdraw") {
      if (b.trlo < amount) return NextResponse.json({ error: "Saldo TRLO tidak cukup." }, { status: 400 })
      b.trlo -= amount; b.rlo += amount
    } else if (action === "spend") {
      if (b.trlo < amount) return NextResponse.json({ error: "Saldo TRLO tidak cukup." }, { status: 400 })
      b.trlo -= amount
    } else if (action === "earn") {
      b.trlo += amount
    } else {
      return NextResponse.json({ error: "action tidak dikenal." }, { status: 400 })
    }
    const err = await save(user, b)
    if (err) return NextResponse.json({ error: err.message }, { status: 500 })
    return NextResponse.json({ rlo: b.rlo, trlo: b.trlo, balance: b.rlo })
  } catch (e: any) { return NextResponse.json({ error: e?.message || "error" }, { status: 500 }) }
}

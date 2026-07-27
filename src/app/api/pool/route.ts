import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type Pool = { deposits: number; premiums: number; payouts: number; policies: number; claims: number }

async function readPool(): Promise<Pool> {
  const { data } = await supabaseAdmin.from("pool").select("*").eq("id", 1).maybeSingle()
  return {
    deposits: Number(data?.deposits ?? 0),
    premiums: Number(data?.premiums ?? 0),
    payouts: Number(data?.payouts ?? 0),
    policies: Number(data?.policies ?? 0),
    claims: Number(data?.claims ?? 0),
  }
}

const balanceOf = (p: Pool) => p.deposits + p.premiums - p.payouts

export async function GET() {
  const pool = await readPool()
  return NextResponse.json({ pool })
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  const action = b?.action
  const amount = Math.max(0, Number(b?.amount) || 0)
  const p = await readPool()
  let paid = 0

  if (action === "deposit") {
    p.deposits += amount
  } else if (action === "withdraw") {
    const w = Math.min(amount, p.deposits, balanceOf(p))
    p.deposits -= w
  } else if (action === "premium") {
    p.premiums += amount
    p.policies += 1
  } else if (action === "claim") {
    const pay = Math.min(amount, balanceOf(p))
    paid = pay
    p.payouts += pay
    if (pay > 0) p.claims += 1
  } else {
    return NextResponse.json({ error: "unknown action" }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from("pool").upsert({
    id: 1,
    deposits: p.deposits,
    premiums: p.premiums,
    payouts: p.payouts,
    policies: p.policies,
    claims: p.claims,
    updated_at: new Date().toISOString(),
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ pool: p, paid })
}

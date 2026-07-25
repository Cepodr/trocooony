import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"
import { verifyPayment } from "@/lib/sepolia"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const GRANT = 300
const TREASURY = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || ""

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  const { user, txHash } = b ?? {}
  if (!user || !txHash) return NextResponse.json({ error: "user, txHash required" }, { status: 400 })
  if (!TREASURY) return NextResponse.json({ error: "Treasury belum dikonfigurasi." }, { status: 500 })

  const { data: existing } = await supabaseAdmin.from("topups").select("tx_hash").eq("tx_hash", txHash).maybeSingle()
  if (existing) return NextResponse.json({ error: "Transaksi ini sudah pernah dipakai top up." }, { status: 400 })

  const v = await verifyPayment(txHash, TREASURY)
  if (!v.ok) return NextResponse.json({ error: v.reason }, { status: 400 })

  const rlo = Number((v.valueWei * 300n) / (10n ** 15n))
  const eth = Number(v.valueWei) / 1e18
  if (rlo < 1) return NextResponse.json({ error: "Nominal terlalu kecil (min 0.001 ETH)." }, { status: 400 })

  const { error: insErr } = await supabaseAdmin.from("topups").insert({ tx_hash: txHash, user_id: user, eth, rlo })
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

  const { data: cur } = await supabaseAdmin.from("credits").select("balance").eq("user_id", user).maybeSingle()
  let base = GRANT
  if (cur) base = Number(cur.balance)
  else await supabaseAdmin.from("credits").insert({ user_id: user, balance: GRANT })
  const next = base + rlo
  const { error: updErr } = await supabaseAdmin
    .from("credits")
    .update({ balance: next, updated_at: new Date().toISOString() })
    .eq("user_id", user)
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, credited: rlo, balance: next })
}

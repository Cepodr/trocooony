import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function toListing(r: Record<string, unknown>) {
  return {
    id: r.id as string,
    name: r.name as string,
    specialty: r.specialty as string,
    persona: r.persona as string,
    price: Number(r.price),
    publisher: r.publisher as string,
    ts: new Date(r.created_at as string).getTime(),
  }
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("marketplace_listings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ listings: (data ?? []).map(toListing) })
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  const { name, specialty, persona, price, publisher } = b ?? {}
  if (!name || !specialty || !persona) {
    return NextResponse.json({ error: "name, specialty, persona required" }, { status: 400 })
  }
  const { data, error } = await supabaseAdmin
    .from("marketplace_listings")
    .insert({ name, specialty, persona, price: price ?? 0, publisher: publisher ?? "you" })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ listing: toListing(data) })
}

export async function DELETE(req: Request) {
  const b = await req.json().catch(() => ({}))
  const id = b?.id
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  const { error } = await supabaseAdmin.from("marketplace_listings").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

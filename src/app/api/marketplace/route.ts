import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Listings published before ownership was tracked carry this placeholder.
// It identifies nobody, so it can never be used to claim or block a slot.
const UNOWNED = "community"

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

  const owner = typeof publisher === "string" ? publisher.trim() : ""
  if (!owner || owner === UNOWNED) {
    return NextResponse.json({ error: "Please sign in before publishing an agent." }, { status: 401 })
  }

  // One agent per account. This is enforced here rather than in the browser,
  // because a hidden form is a suggestion and a server check is a rule.
  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("marketplace_listings")
    .select("id, name")
    .eq("publisher", owner)
    .limit(1)
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 })
  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: "You already published " + (existing[0].name as string) + ". Each account can publish one agent." },
      { status: 409 }
    )
  }

  const { data, error } = await supabaseAdmin
    .from("marketplace_listings")
    .insert({ name, specialty, persona, price: price ?? 0, publisher: owner })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ listing: toListing(data) })
}

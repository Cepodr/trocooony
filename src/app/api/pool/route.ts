import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const YEAR_SECONDS = 31536000

type Pool = {
  deposits: number
  premiums: number
  payouts: number
  policies: number
  claims: number
  reserveBps: number
  apyBps: number
  yieldAccrued: number
  lastAccrual: string
  activeCoverage: number
}

async function readPool(): Promise<Pool> {
  const { data } = await supabaseAdmin.from("pool").select("*").eq("id", 1).maybeSingle()
  return {
    deposits: Number(data?.deposits ?? 0),
    premiums: Number(data?.premiums ?? 0),
    payouts: Number(data?.payouts ?? 0),
    policies: Number(data?.policies ?? 0),
    claims: Number(data?.claims ?? 0),
    reserveBps: Number(data?.reserve_bps ?? 7000),
    apyBps: Number(data?.apy_bps ?? 430),
    yieldAccrued: Number(data?.yield_accrued ?? 0),
    lastAccrual: String(data?.last_accrual ?? new Date().toISOString()),
    activeCoverage: Number(data?.active_coverage ?? 0),
  }
}

const balanceOf = (p: Pool) => p.deposits + p.premiums + p.yieldAccrued - p.payouts
const reserveOf = (p: Pool) => Math.max(0, (balanceOf(p) * p.reserveBps) / 10000)
const cashOf = (p: Pool) => Math.max(0, balanceOf(p) - reserveOf(p))

function accrue(p: Pool): number {
  const now = Date.now()
  const last = new Date(p.lastAccrual).getTime()
  const from = Number.isNaN(last) ? now : last
  const elapsed = Math.max(0, (now - from) / 1000)
  const earned = reserveOf(p) * (p.apyBps / 10000) * (elapsed / YEAR_SECONDS)
  p.yieldAccrued += earned
  p.lastAccrual = new Date(now).toISOString()
  return earned
}

const solvency = (p: Pool) => balanceOf(p) / Math.max(1, p.activeCoverage)

function loadingOf(p: Pool): number {
  const s = solvency(p)
  if (s < 1.5) return 1.3
  if (s > 3) return 1.1
  return 1.2
}

function view(p: Pool, paid: number) {
  return {
    pool: p,
    paid,
    balance: balanceOf(p),
    reserve: reserveOf(p),
    cash: cashOf(p),
    yieldAccrued: p.yieldAccrued,
    apyBps: p.apyBps,
    activeCoverage: p.activeCoverage,
    solvency: solvency(p),
    loading: loadingOf(p),
  }
}

async function persist(p: Pool) {
  return supabaseAdmin.from("pool").upsert({
    id: 1,
    deposits: p.deposits,
    premiums: p.premiums,
    payouts: p.payouts,
    policies: p.policies,
    claims: p.claims,
    yield_accrued: p.yieldAccrued,
    last_accrual: p.lastAccrual,
    active_coverage: p.activeCoverage,
    updated_at: new Date().toISOString(),
  })
}

export async function GET() {
  const p = await readPool()
  const earned = accrue(p)
  if (earned > 0.000001) await persist(p)
  return NextResponse.json(view(p, 0))
}

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}))
  const action = b?.action
  const amount = Math.max(0, Number(b?.amount) || 0)
  const coverage = Math.max(0, Number(b?.coverage) || 0)
  const p = await readPool()
  accrue(p)
  let paid = 0

  if (action === "deposit") {
    p.deposits += amount
  } else if (action === "withdraw") {
    const w = Math.min(amount, p.deposits, cashOf(p))
    p.deposits -= w
  } else if (action === "premium") {
    p.premiums += amount
    p.policies += 1
    p.activeCoverage += coverage
  } else if (action === "release") {
    p.activeCoverage = Math.max(0, p.activeCoverage - (coverage || amount))
  } else if (action === "claim") {
    const pay = Math.min(amount, balanceOf(p))
    paid = pay
    p.payouts += pay
    if (pay > 0) p.claims += 1
    p.activeCoverage = Math.max(0, p.activeCoverage - (coverage || amount))
  } else {
    return NextResponse.json({ error: "unknown action" }, { status: 400 })
  }

  const { error } = await persist(p)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(view(p, paid))
}

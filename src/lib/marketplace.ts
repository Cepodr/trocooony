"use client"

import { useCallback, useEffect, useState } from "react"

export type Listing = {
  id: string; name: string; specialty: string
  persona: string; price: number; publisher: string; ts: number
}

export type Pool = {
  deposits: number
  premiums: number
  payouts: number
  policies: number
  claims: number
  yieldAccrued: number
  activeCoverage: number
  apyBps: number
  reserveBps: number
}

export type MarketState = { listings: Listing[]; pool: Pool }

const EMPTY_POOL: Pool = {
  deposits: 0, premiums: 0, payouts: 0, policies: 0, claims: 0,
  yieldAccrued: 0, activeCoverage: 0, apyBps: 430, reserveBps: 7000,
}

export function normalizePool(raw: unknown): Pool {
  const p = (raw ?? {}) as Record<string, unknown>
  return {
    deposits: Number(p.deposits ?? 0),
    premiums: Number(p.premiums ?? 0),
    payouts: Number(p.payouts ?? 0),
    policies: Number(p.policies ?? 0),
    claims: Number(p.claims ?? 0),
    yieldAccrued: Number(p.yieldAccrued ?? p.yield_accrued ?? 0),
    activeCoverage: Number(p.activeCoverage ?? p.active_coverage ?? 0),
    apyBps: Number(p.apyBps ?? p.apy_bps ?? 430),
    reserveBps: Number(p.reserveBps ?? p.reserve_bps ?? 7000),
  }
}

export const poolBalanceOf = (p: Pool) => p.deposits + p.premiums + p.yieldAccrued - p.payouts
export const poolReserveOf = (p: Pool) => Math.max(0, (poolBalanceOf(p) * p.reserveBps) / 10000)
export const poolCashOf = (p: Pool) => Math.max(0, poolBalanceOf(p) - poolReserveOf(p))
export const poolSolvencyOf = (p: Pool) => poolBalanceOf(p) / Math.max(1, p.activeCoverage)

export function poolLoadingOf(p: Pool): number {
  const s = poolSolvencyOf(p)
  if (s < 1.5) return 1.3
  if (s > 3) return 1.1
  return 1.2
}

export function useMarketplace() {
  const [listings, setListings] = useState<Listing[]>([])
  const [pool, setPool] = useState<Pool>(EMPTY_POOL)

  const refresh = useCallback(() => {
    fetch("/api/marketplace").then((r) => r.json()).then((d) => {
      if (Array.isArray(d.listings)) setListings(d.listings as Listing[])
    }).catch(() => {})
    fetch("/api/pool").then((r) => r.json()).then((d) => {
      if (d && d.pool) setPool(normalizePool(d.pool))
    }).catch(() => {})
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const publishListing = useCallback((l: Omit<Listing, "id" | "ts">) => {
    fetch("/api/marketplace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(l),
    }).then((r) => r.json()).then((d) => {
      if (d && d.listing) setListings((prev) => [d.listing as Listing, ...prev])
    }).catch(() => {})
  }, [])

  const poolAction = useCallback((action: string, amount: number, coverage = 0) => {
    fetch("/api/pool", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, amount, coverage }),
    }).then((r) => r.json()).then((d) => {
      if (d && d.pool) setPool(normalizePool(d.pool))
    }).catch(() => {})
  }, [])

  const depositToPool = useCallback((amount: number) => poolAction("deposit", amount), [poolAction])
  const withdrawFromPool = useCallback((amount: number) => poolAction("withdraw", amount), [poolAction])
  const collectPremium = useCallback((amount: number, coverage = 0) => poolAction("premium", amount, coverage), [poolAction])
  const releaseCoverage = useCallback((coverage: number) => poolAction("release", 0, coverage), [poolAction])

  const payClaim = useCallback(async (amount: number, coverage = 0): Promise<number> => {
    try {
      const r = await fetch("/api/pool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim", amount, coverage }),
      })
      const d = await r.json()
      if (d && d.pool) setPool(normalizePool(d.pool))
      return typeof d?.paid === "number" ? d.paid : 0
    } catch { return 0 }
  }, [])

  return {
    listings,
    pool,
    poolBalance: Math.round(poolBalanceOf(pool)),
    poolBalanceExact: poolBalanceOf(pool),
    poolReserve: poolReserveOf(pool),
    poolCash: poolCashOf(pool),
    poolYield: pool.yieldAccrued,
    poolSolvency: poolSolvencyOf(pool),
    poolLoading: poolLoadingOf(pool),
    activeCoverage: pool.activeCoverage,
    apyBps: pool.apyBps,
    publishListing,
    depositToPool, withdrawFromPool, collectPremium, releaseCoverage, payClaim,
  }
}

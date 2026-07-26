"use client"

import { useCallback, useEffect, useState } from "react"

export type Listing = {
  id: string; name: string; specialty: string
  persona: string; price: number; publisher: string; ts: number
}
export type Pool = { deposits: number; premiums: number; payouts: number; policies: number; claims: number }
export type MarketState = { listings: Listing[]; pool: Pool }

const EMPTY_POOL: Pool = { deposits: 0, premiums: 0, payouts: 0, policies: 0, claims: 0 }

export const poolBalanceOf = (p: Pool) => p.deposits + p.premiums - p.payouts

export function useMarketplace() {
  const [listings, setListings] = useState<Listing[]>([])
  const [pool, setPool] = useState<Pool>(EMPTY_POOL)

  const refresh = useCallback(() => {
    fetch("/api/marketplace").then((r) => r.json()).then((d) => {
      if (Array.isArray(d.listings)) setListings(d.listings as Listing[])
    }).catch(() => {})
    fetch("/api/pool").then((r) => r.json()).then((d) => {
      if (d && d.pool) setPool(d.pool as Pool)
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

  const removeListing = useCallback((id: string) => {
    setListings((prev) => prev.filter((x) => x.id !== id))
    fetch("/api/marketplace", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {})
  }, [])

  const poolAction = useCallback((action: string, amount: number) => {
    fetch("/api/pool", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, amount }),
    }).then((r) => r.json()).then((d) => {
      if (d && d.pool) setPool(d.pool as Pool)
    }).catch(() => {})
  }, [])

  const depositToPool = useCallback((amount: number) => poolAction("deposit", amount), [poolAction])
  const withdrawFromPool = useCallback((amount: number) => poolAction("withdraw", amount), [poolAction])
  const collectPremium = useCallback((amount: number) => poolAction("premium", amount), [poolAction])
  const payClaim = useCallback(async (amount: number): Promise<number> => {
    try {
      const r = await fetch("/api/pool", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "claim", amount }) })
      const d = await r.json()
      if (d && d.pool) setPool(d.pool as Pool)
      return typeof d?.paid === "number" ? d.paid : 0
    } catch { return 0 }
  }, [])
  const reset = useCallback(() => { setListings([]); poolAction("reset", 0) }, [poolAction])

  return {
    listings,
    pool,
    poolBalance: poolBalanceOf(pool),
    publishListing, removeListing,
    depositToPool, withdrawFromPool, collectPremium, payClaim, reset,
  }
}

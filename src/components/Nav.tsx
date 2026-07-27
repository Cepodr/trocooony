"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { Menu, X, Wallet, Check, Coins } from "lucide-react"
import { useAuth } from "@/context/AuthProvider"
import RialoSignInModal from "@/components/RialoSignInModal"
import TopUpModal from "@/components/TopUpModal"
import { useCredits } from "@/context/CreditsProvider"

const links = [
  { href: "/agents", label: "Agents" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/workflow", label: "Workflow" },
  { href: "/docs", label: "Docs" },
  { href: "/dashboard", label: "Dashboard" },
]

const short = (a: string) => a.slice(0, 6) + "…" + a.slice(-4)

export default function Nav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [signInOpen, setSignInOpen] = useState(false)
  const [topupOpen, setTopupOpen] = useState(false)
  const [menu, setMenu] = useState<"none" | "acct" | "wallet">("none")
  const { identity, wallet, connectWallet, disconnectWallet, signOutRialo, walletError } = useAuth()
  const { rlo, trlo } = useCredits()
  const onSepolia = wallet?.chainId === "0xaa36a7"
  const menuRef = useRef<HTMLDivElement>(null)
  const [injected, setInjected] = useState(true)
  useEffect(() => { setInjected(typeof (window as unknown as { ethereum?: unknown }).ethereum !== "undefined") }, [])
  useEffect(() => {
    if (menu === "none") return
    const onDown = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu("none") }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu("none") }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey) }
  }, [menu])

  return (
    <header className="sticky top-0 z-40 border-b border-[#2A2119] bg-[#0D0A07]/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5">
        <Link href="/" className="flex shrink-0 items-center">
          <img src="/logo.png" alt="Trocooony" className="h-10 w-auto" />
        </Link>

        <div className="hidden items-center gap-4 xl:flex">
          {links.map((l) => {
            const active = pathname === l.href
            return (
              <Link key={l.href} href={l.href} className={`whitespace-nowrap text-sm transition-colors ${active ? "text-[#F1EADD]" : "text-[#B2A693] hover:text-[#F1EADD]"}`}>{l.label}</Link>
            )
          })}
        </div>

        <div className="relative hidden shrink-0 items-center gap-3 xl:flex" ref={menuRef}>
          {menu !== "none" && (
            <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl border border-[#2A2119] bg-[#16120D] p-3 shadow-2xl">
              {menu === "acct" && identity && (
                <div>
                  <p className="text-xs text-[#847668]">Signed in as</p>
                  <p className="mt-0.5 truncate text-sm text-[#F1EADD]">{identity.handle}</p>
                  <p className="mt-1 text-xs text-[#B2A693]">{trlo} TRLO / {rlo} RLO</p>
                  <button onClick={() => { setMenu("none"); setTopupOpen(true) }} className="mt-3 w-full rounded-lg border border-[#2A2119] px-3 py-2 text-left text-sm text-[#F1EADD] hover:border-[#EAE1CE]/50">Top up balance</button>
                  <button onClick={() => { setMenu("none"); signOutRialo() }} className="mt-2 w-full rounded-lg border border-[#2A2119] px-3 py-2 text-left text-sm text-[#FF6B6B] hover:border-[#FF6B6B]/50">Disconnect</button>
                </div>
              )}
              {menu === "wallet" && wallet && (
                <div>
                  <p className="text-xs text-[#847668]">Wallet</p>
                  <p className="mt-0.5 break-all text-sm text-[#F1EADD]">{wallet.address}</p>
                  <p className="mt-1 text-xs text-[#B2A693]">{onSepolia ? "Ethereum Sepolia" : "Wrong network"}</p>
                  <button onClick={() => { setMenu("none"); disconnectWallet() }} className="mt-3 w-full rounded-lg border border-[#2A2119] px-3 py-2 text-left text-sm text-[#FF6B6B] hover:border-[#FF6B6B]/50">Disconnect wallet</button>
                </div>
              )}
            </div>
          )}
            {identity && (
              <button onClick={() => setTopupOpen(true)} className="flex items-center gap-1.5 rounded-lg border border-[#2A2119] px-3 py-1.5 text-sm text-[#EAE1CE] hover:border-[#EAE1CE]/50" title="Top up & manage balance">
                <Coins className="h-4 w-4" />{trlo} TRLO · {rlo} RLO
              </button>
            )}
          {identity ? (
            <button onClick={() => setMenu(menu === "acct" ? "none" : "acct")} className="flex items-center gap-1.5 rounded-lg border border-[#2A2119] px-3 py-1.5 text-sm text-[#F1EADD] hover:border-[#EAE1CE]/50" title="Signed in">
              <Check className="h-4 w-4 text-[#EAE1CE]" /><span className="max-w-[140px] truncate">{identity.handle}</span>
            </button>
          ) : (
            <button onClick={() => setSignInOpen(true)} className="rounded-lg bg-[#EAE1CE] px-3.5 py-1.5 text-sm font-medium text-[#0D0A07] hover:bg-[#F4EEDF]">Sign in</button>
          )}

          {wallet ? (
            <button onClick={() => setMenu(menu === "wallet" ? "none" : "wallet")} className="flex items-center gap-1.5 rounded-lg border border-[#2A2119] px-3 py-1.5 text-sm text-[#F1EADD] hover:border-[#FF6B6B]/50" title={onSepolia ? "Connected to Sepolia" : "Wrong network"}>
              <span className={`h-2 w-2 rounded-full ${onSepolia ? "bg-[#EAE1CE]" : "bg-[#F5B759]"}`} />{short(wallet.address)}
            </button>
          ) : (
            <button onClick={connectWallet} className="flex items-center gap-1.5 rounded-lg border border-[#2A2119] px-3.5 py-1.5 text-sm text-[#F1EADD] hover:border-[#EAE1CE]/50">
              <Wallet className="h-4 w-4" />Connect Wallet
            </button>
          )}
        </div>

        <button className="text-[#F1EADD] xl:hidden" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</button>
      </nav>

      {open && (
        <div className="border-t border-[#2A2119] bg-[#0D0A07] px-5 py-4 xl:hidden">
          <div className="flex flex-col gap-3">
            {links.map((l) => (<Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="text-sm text-[#B2A693]">{l.label}</Link>))}
            <div className="mt-2 flex flex-col gap-2">
              {identity ? (
                <><button onClick={() => setTopupOpen(true)} className="rounded-lg border border-[#2A2119] px-3 py-2 text-sm text-[#EAE1CE]">{trlo} TRLO / {rlo} RLO, top up</button>
                                    <button onClick={() => { setOpen(false); signOutRialo() }} className="rounded-lg border border-[#2A2119] px-3 py-2 text-sm text-[#FF6B6B]">Disconnect {identity.handle}</button></>
              ) : (
                <button onClick={() => { setSignInOpen(true); setOpen(false) }} className="rounded-lg bg-[#EAE1CE] px-3 py-2 text-sm font-medium text-[#0D0A07]">Sign in</button>
              )}
              {wallet ? (
                <button onClick={() => { setOpen(false); disconnectWallet() }} className="rounded-lg border border-[#2A2119] px-3 py-2 text-sm text-[#FF6B6B]">Disconnect {short(wallet.address)}</button>
              ) : (
                injected ? (
                  <button onClick={connectWallet} className="rounded-lg border border-[#2A2119] px-3 py-2 text-sm text-[#F1EADD]">Connect Wallet (Sepolia)</button>
                ) : (
                  <a href="https://metamask.app.link/dapp/www.trocooony.tech" className="rounded-lg border border-[#2A2119] px-3 py-2 text-center text-sm text-[#F1EADD]">Connect Wallet (Sepolia)</a>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {walletError && (<div className="border-t border-[#FF6B6B]/30 bg-[#FF6B6B]/10 px-5 py-2 text-center text-xs text-[#FF6B6B]">{walletError}</div>)}

        <TopUpModal open={topupOpen} onClose={() => setTopupOpen(false)} />
      <RialoSignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
    </header>
  )
}

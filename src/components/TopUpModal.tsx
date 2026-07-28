"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { X, Wallet, Loader2, CheckCircle2, Coins } from "lucide-react"
import { useAuth } from "@/context/AuthProvider"
import { useCredits } from "@/context/CreditsProvider"

const TREASURY = process.env.NEXT_PUBLIC_TREASURY_ADDRESS || ""
const PRESETS = [
  { eth: "0.001", rlo: 300 },
  { eth: "0.002", rlo: 600 },
  { eth: "0.005", rlo: 1500 },
]

function toWeiHex(eth: string): string {
  const [i, f = ""] = eth.split(".")
  const frac = (f + "0".repeat(18)).slice(0, 18)
  const wei = BigInt(i || "0") * (10n ** 18n) + BigInt(frac || "0")
  return "0x" + wei.toString(16)
}

export default function TopUpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { wallet, connectWallet } = useAuth()
  const { topup } = useCredits()
  const [amount, setAmount] = useState("0.001")
  const [phase, setPhase] = useState<"idle" | "sending" | "verifying" | "done" | "error">("idle")
  const [msg, setMsg] = useState("")
  const [credited, setCredited] = useState(0)

  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!open || !mounted) return null
  const rlo = Math.floor((Number(amount || "0") / 0.001) * 300)

  async function pay() {
    setMsg(""); setPhase("sending")
    const eth = (window as any).ethereum
    if (!eth) { setPhase("error"); setMsg("MetaMask not found."); return }
    if (!TREASURY) { setPhase("error"); setMsg("Treasury is not configured."); return }
    try {
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" })
      try { await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0xaa36a7" }] }) } catch (se: any) { if (se && se.code === 4902) { try { await eth.request({ method: "wallet_addEthereumChain", params: [{ chainId: "0xaa36a7", chainName: "Sepolia", nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 }, rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"], blockExplorerUrls: ["https://sepolia.etherscan.io"] }] }) } catch { setPhase("error"); setMsg("Could not add the Sepolia network. Please add it manually in your wallet."); return } } else { setPhase("error"); setMsg("Please switch your wallet to Sepolia to continue."); return } }
      const cid: string = await eth.request({ method: "eth_chainId" })
      if (cid !== "0xaa36a7") { setPhase("error"); setMsg("Wrong network. Switch to Sepolia and try again."); return }
      const txHash: string = await eth.request({
        method: "eth_sendTransaction",
        params: [{ from: accounts[0], to: TREASURY, value: toWeiHex(amount) }],
      })
      setPhase("verifying")
      setMsg("Waiting for on-chain confirmation… (can take ~15 seconds)")
      let ok = false
      for (let i = 0; i < 20; i++) {
        const res = await topup(txHash)
        if (res.ok) { ok = true; setCredited(res.credited || rlo); break }
        if (res.error && !/not found|not confirmed|not propagated/i.test(res.error)) { setPhase("error"); setMsg(res.error); return }
        await new Promise((r) => setTimeout(r, 3000))
      }
      if (ok) setPhase("done")
      else { setPhase("error"); setMsg("Timed out waiting for confirmation. The transaction may still be processing, try again shortly.") }
    } catch (e: any) {
      setPhase("error"); setMsg(e?.message || "Transaction cancelled.")
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/60 p-4" onClick={onClose}>
      <div className="my-auto max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl panel panel-grid p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold text-[#F1EADD]"><Coins className="h-4 w-4 text-[#EAE1CE]" /> Top up RLO with Sepolia</h3>
          <button onClick={onClose} className="text-[#847668] hover:text-[#F1EADD]"><X className="h-5 w-5" /></button>
        </div>

        {phase === "done" ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-[#EAE1CE]" />
            <p className="text-sm text-[#F1EADD]">Success! <span className="font-semibold">+{credited} RLO</span> added to your balance.</p>
            <button onClick={onClose} className="mt-4 rounded-lg bg-[#EAE1CE] px-4 py-2 text-sm font-medium text-[#0D0A07] hover:bg-[#F4EEDF]">Done</button>
          </div>
        ) : (
          <>
            <p className="mb-4 text-xs text-[#B2A693]">Rate: <span className="text-[#EAE1CE]">0.001 ETH = 300 RLO</span>. ETH is sent to the treasury on Sepolia, then verified on-chain.</p>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {PRESETS.map((pp) => (
                <button key={pp.eth} onClick={() => setAmount(pp.eth)} disabled={phase !== "idle"}
                  className={`rounded-lg border px-2 py-2 text-center text-xs transition-colors disabled:opacity-50 ${amount === pp.eth ? "border-[#EAE1CE] bg-[#EAE1CE]/10 text-[#F1EADD]" : "border-[#2A2119] text-[#B2A693] hover:border-[#EAE1CE]/40"}`}>
                  <span className="block font-medium">{pp.eth} ETH</span>
                  <span className="block text-[10px] text-[#847668]">{pp.rlo} RLO</span>
                </button>
              ))}
            </div>
            <label className="mb-1.5 block text-xs text-[#B2A693]">ETH amount</label>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} disabled={phase !== "idle"}
              className="mb-1 w-full rounded-lg panel px-3 py-2.5 text-sm text-[#F1EADD] outline-none focus:border-[#EAE1CE]/50 disabled:opacity-50" />
            <p className="mb-4 text-[11px] text-[#847668]">You will receive ~{rlo} RLO.</p>

            {wallet && wallet.chainId !== "0xaa36a7" && (
              <button onClick={connectWallet} className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg border border-[#F5B759]/50 px-4 py-2.5 text-sm text-[#F5B759] hover:bg-[#F5B759]/10">
                <Wallet className="h-4 w-4" /> Wrong network. Switch to Sepolia
              </button>
            )}

            {!wallet ? (
              <button onClick={connectWallet} className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#2A2119] px-4 py-2.5 text-sm text-[#F1EADD] hover:border-[#EAE1CE]/50">
                <Wallet className="h-4 w-4" /> Connect Wallet first
              </button>
            ) : (
              <button onClick={pay} disabled={phase === "sending" || phase === "verifying" || rlo < 1 || wallet.chainId !== "0xaa36a7"}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#EAE1CE] px-4 py-2.5 text-sm font-medium text-[#0D0A07] hover:bg-[#F4EEDF] disabled:opacity-50">
                {(phase === "sending" || phase === "verifying") ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                {phase === "sending" ? "Waiting for MetaMask…" : phase === "verifying" ? "Verifying on-chain…" : `Pay ${amount} ETH`}
              </button>
            )}
            {msg && <p className={`mt-3 text-center text-xs ${phase === "error" ? "text-[#FF6B6B]" : "text-[#847668]"}`}>{msg}</p>}
          </>
        )}
      </div>
    </div>
  , document.body)
}

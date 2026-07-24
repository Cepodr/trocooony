"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"
import { useSession, signOut as naSignOut } from "next-auth/react"

type Identity = { handle: string; image?: string | null } | null
type Wallet = { address: string; chainId: string } | null

type AuthCtx = {
  identity: Identity
  loadingIdentity: boolean
  wallet: Wallet
  signOutRialo: () => void
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  walletError: string | null
}

const Ctx = createContext<AuthCtx | null>(null)
const SEPOLIA = "0xaa36a7" // 11155111

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession()
  const identity: Identity = session?.user
    ? { handle: session.user.name || session.user.email || "Rialo user", image: session.user.image }
    : null

  const [wallet, setWallet] = useState<Wallet>(null)
  const [walletError, setWalletError] = useState<string | null>(null)

  const signOutRialo = () => naSignOut()

  const connectWallet = async () => {
    setWalletError(null)
    const eth = (window as any).ethereum
    if (!eth) { setWalletError("Wallet tidak ditemukan. Pasang MetaMask dulu."); return }
    try {
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" })
      try {
        await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA }] })
      } catch (switchErr: any) {
        if (switchErr?.code === 4902) {
          await eth.request({
            method: "wallet_addEthereumChain",
            params: [{
              chainId: SEPOLIA,
              chainName: "Sepolia",
              nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: ["https://rpc.sepolia.org"],
              blockExplorerUrls: ["https://sepolia.etherscan.io"],
            }],
          })
        }
      }
      const chainId: string = await eth.request({ method: "eth_chainId" })
      setWallet({ address: accounts[0], chainId })
    } catch (e: any) {
      setWalletError(e?.message || "Gagal connect wallet")
    }
  }
  const disconnectWallet = () => setWallet(null)

  useEffect(() => {
    const eth = (window as any).ethereum
    if (!eth?.on) return
    const onAccounts = (a: string[]) =>
      setWallet((w) => (a[0] ? { address: a[0], chainId: w?.chainId || SEPOLIA } : null))
    const onChain = (c: string) => setWallet((w) => (w ? { ...w, chainId: c } : w))
    eth.on("accountsChanged", onAccounts)
    eth.on("chainChanged", onChain)
    return () => {
      eth.removeListener?.("accountsChanged", onAccounts)
      eth.removeListener?.("chainChanged", onChain)
    }
  }, [])

  return (
    <Ctx.Provider value={{ identity, loadingIdentity: status === "loading", wallet, signOutRialo, connectWallet, disconnectWallet, walletError }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const c = useContext(Ctx)
  if (!c) throw new Error("useAuth must be used within AuthProvider")
  return c
}

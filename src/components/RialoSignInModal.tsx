"use client"

import { signIn } from "next-auth/react"
import { X } from "lucide-react"

export default function RialoSignInModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-[#2A2119] bg-[#16120D] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#F1EADD]">Sign in to Trocooony</h3>
          <button onClick={onClose} className="text-[#847668] hover:text-[#F1EADD]"><X className="h-5 w-5" /></button>
        </div>
        <p className="mb-5 text-sm text-[#B2A693]">No seed phrase, no gas. Use your real-world identity as your Web3 passport. New here? You&apos;ll be guided to create an account.</p>

        <div className="flex flex-col gap-2">
          <button onClick={() => signIn("discord", { callbackUrl: "/dashboard" })}
            className="rounded-lg bg-[#5865F2] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90">
            Continue with Discord
          </button>
          <button onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
            className="rounded-lg border border-[#2A2119] px-4 py-2.5 text-sm text-[#F1EADD] hover:border-[#EAE1CE]/50">
            Continue with Google
          </button>
        </div>

        <p className="mt-4 text-center text-[11px] text-[#847668]">Secured by Auth.js · OAuth 2.0. Email magic-link coming soon.</p>
      </div>
    </div>
  )
}

import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Nav from "@/components/Nav"
import Footer from "@/components/Footer"
import Providers from "@/components/Providers"
import { AuthProvider } from "@/context/AuthProvider"
import { ReputationProvider } from "@/context/ReputationProvider"
import { CreditsProvider } from "@/context/CreditsProvider"
import { ToastProvider } from "@/context/ToastProvider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Trocooony, On-chain labor market for AI agents",
  description: "Escrow-backed AI agent work with autonomous judging and deadline auto-refunds, built for Rialo.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-[#0D0A07] text-[#F1EADD] antialiased`}>
        <Providers>
          <AuthProvider>
            <ReputationProvider>
          <CreditsProvider>
              <ToastProvider>
              <Nav />
              {children}
              <Footer />
            </ToastProvider>
            </CreditsProvider>
        </ReputationProvider>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  )
}

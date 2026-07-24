import Link from "next/link"

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-[#2A2119] bg-[#0D0A07]">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <Link href="/" className="mb-3 flex items-center gap-2">
            <img src="/logo.png" alt="Trocooony" className="h-6 w-auto" />
            <span className="text-[15px] font-semibold text-[#F1EADD]">Trocooony</span>
          </Link>
          <p className="max-w-sm text-sm text-[#B2A693]">
            An on-chain labor market for AI agents — escrow-backed work, autonomous judging,
            and deadline auto-refunds, built on Rialo.
          </p>
        </div>

        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#847668]">Product</p>
          <ul className="space-y-2 text-sm text-[#B2A693]">
            <li><Link href="/dashboard" className="hover:text-[#EAE1CE]">Dashboard</Link></li>
            <li><Link href="/docs" className="hover:text-[#EAE1CE]">Docs</Link></li>
            <li><Link href="/faq" className="hover:text-[#EAE1CE]">FAQ</Link></li>
          </ul>
        </div>

        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[#847668]">Ecosystem</p>
          <ul className="space-y-2 text-sm text-[#B2A693]">
            <li><a href="https://rialo.io" target="_blank" rel="noreferrer" className="hover:text-[#EAE1CE]">Rialo</a></li>
            <li><a href="https://docs.rialo.io" target="_blank" rel="noreferrer" className="hover:text-[#EAE1CE]">Rialo Docs</a></li>
            <li><a href="https://x.com/RialoHQ" target="_blank" rel="noreferrer" className="hover:text-[#EAE1CE]">@RialoHQ</a></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-[#2A2119] py-5 text-center text-xs text-[#847668]">
        © {new Date().getFullYear()} Trocooony · Built for the Rialo community
      </div>
    </footer>
  )
}

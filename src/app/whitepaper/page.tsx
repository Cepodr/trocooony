import fs from "fs"
import path from "path"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

export const dynamic = "force-static"
export const metadata = { title: "Whitepaper — Trocooony" }

const C: any = {
  h1: (p: any) => <h1 className="mb-2 text-3xl font-semibold text-[#F1EADD]" {...p} />,
  h2: (p: any) => <h2 className="mb-3 mt-10 border-b border-[#2A2119] pb-2 text-xl font-semibold text-[#F1EADD]" {...p} />,
  h3: (p: any) => <h3 className="mb-2 mt-6 text-lg font-medium text-[#EAE1CE]" {...p} />,
  p: (p: any) => <p className="mb-4 leading-7 text-[#B2A693]" {...p} />,
  ul: (p: any) => <ul className="mb-4 list-disc space-y-1.5 pl-6 text-[#B2A693]" {...p} />,
  ol: (p: any) => <ol className="mb-4 list-decimal space-y-1.5 pl-6 text-[#B2A693]" {...p} />,
  li: (p: any) => <li className="leading-7" {...p} />,
  strong: (p: any) => <strong className="font-semibold text-[#F1EADD]" {...p} />,
  em: (p: any) => <em className="italic text-[#CDC3AC]" {...p} />,
  a: (p: any) => <a className="text-[#EAE1CE] underline hover:text-[#F4EEDF]" {...p} />,
  blockquote: (p: any) => <blockquote className="mb-4 border-l-2 border-[#EAE1CE]/50 bg-[#16120D] py-2 pl-4 pr-3 italic text-[#CDC3AC]" {...p} />,
  code: (p: any) => <code className="rounded bg-[#0B0906] px-1.5 py-0.5 text-[13px] text-[#EAE1CE]" {...p} />,
  pre: (p: any) => <pre className="mb-4 overflow-x-auto rounded-lg border border-[#2A2119] bg-[#0B0906] p-3 text-[13px] text-[#EAE1CE]" {...p} />,
  hr: () => <hr className="my-8 border-[#2A2119]" />,
  table: (p: any) => <div className="mb-4 overflow-x-auto"><table className="w-full border-collapse text-sm" {...p} /></div>,
  th: (p: any) => <th className="border-b border-[#2A2119] px-3 py-2 text-left font-semibold text-[#F1EADD]" {...p} />,
  td: (p: any) => <td className="border-b border-[#2A2119] px-3 py-2 text-[#B2A693]" {...p} />,
}

export default function WhitepaperPage() {
  const md = fs.readFileSync(path.join(process.cwd(), "WHITEPAPER.md"), "utf8")
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <article>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={C}>{md}</ReactMarkdown>
      </article>
    </main>
  )
}

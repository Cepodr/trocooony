import Image from "next/image"

const TEAM = [
  { name: "Cepodr", handle: "cepodrrr", role: "Product & Protocol", img: "/team/cepodr.jpg" },
  { name: "Giselle", handle: "Giselle20_", role: "Design & Community", img: "/team/giselle.jpg" },
  { name: "Yuhuu", handle: "0xyuhuu96", role: "Economics & Research", img: "/team/yuhuu.jpg" },
]

export default function Team() {
  return (
    <section id="team" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16">
      <p className="mb-2 text-center text-sm font-medium text-[#EAE1CE]">Team</p>
      <h2 className="mb-3 text-center text-2xl font-semibold text-[#F1EADD] md:text-3xl">The builders behind Trocooony</h2>
      <p className="mx-auto mb-10 max-w-xl text-center text-sm text-[#B2A693]">Three builders shipping in the open on Rialo.</p>
      <div className="grid gap-5 md:grid-cols-3">
        {TEAM.map((m) => (
          <a
            key={m.handle}
            href={"https://x.com/" + m.handle}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-4 rounded-2xl border border-[#2A2119] bg-[#16120D] p-5 transition-colors hover:border-[#EAE1CE]/40"
          >
            <Image src={m.img} alt={m.name} width={56} height={56} className="h-14 w-14 rounded-full border border-[#2A2119] object-cover" />
            <div>
              <p className="text-sm font-medium text-[#F1EADD]">{m.name}</p>
              <p className="text-xs text-[#847668]">{m.role}</p>
              <p className="mt-1 text-xs text-[#B2A693]">@{m.handle}</p>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}

"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

export default function CursorTilt({ children, max = 24 }: { children: ReactNode; max?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [p, setP] = useState({ x: 0, y: 0 })
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)")
    const sync = () => setReduced(m.matches)
    sync()
    m.addEventListener("change", sync)
    const onMove = (e: MouseEvent) => {
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const nx = (e.clientX - (r.left + r.width / 2)) / (r.width * 0.55)
      const ny = (e.clientY - (r.top + r.height / 2)) / (r.height * 0.55)
      setP({ x: Math.max(-1, Math.min(1, nx)), y: Math.max(-1, Math.min(1, ny)) })
    }
    window.addEventListener("mousemove", onMove)
    return () => {
      window.removeEventListener("mousemove", onMove)
      m.removeEventListener("change", sync)
    }
  }, [])

  const k = reduced ? 0 : 1
  const t = "rotateX(" + (-p.y * max * k) + "deg) rotateY(" + (p.x * max * k) + "deg)"

  return (
    <div ref={ref} className="relative" style={{ perspective: "1100px" }}>
      <div className="transition-transform duration-100 ease-out" style={{ transform: t, transformStyle: "preserve-3d" }}>
        {children}
      </div>
    </div>
  )
}

"use client"

import { useEffect, useRef } from "react"

type Props = { src?: string; maxWidth?: number; className?: string }

export default function TrocoonyParticles({
  src = "/logo.png",
  maxWidth = 460,
  className = "",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    type P = {
      hx: number; hy: number; r: number; g: number; b: number; a: number
      ang: number; dist: number; curl: number
      phase: number; speed: number; size: number; delay: number
    }
    let particles: P[] = []
    let W = 0, H = 0, cx = 0, cy = 0, maxR = 0, raf = 0, start = 0

    const cycle = 8500
    const spread = 0.5
    const smooth = (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x))
    const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
    const rnd = (a: number, b: number) => a + Math.random() * (b - a)
    const disp = (elapsed: number) => {
      if (reduce) return 0
      const p = (((((elapsed + 0.8 * cycle) % cycle) + cycle) % cycle)) / cycle
      if (p < 0.4) return 0
      if (p < 0.58) return smooth((p - 0.4) / 0.18)
      if (p < 0.72) return 1
      return 1 - smooth((p - 0.72) / 0.28)
    }

    const padFX = 0.42, padFY = 0.55

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = src
    img.onload = () => {
      const aspect = img.height / img.width || 1
      const totalW = Math.min(maxWidth * 1.7, Math.floor(window.innerWidth * 0.94))
      const logoW = Math.floor(totalW / (1 + 2 * padFX))
      const logoH = Math.round(logoW * aspect)
      const padX = Math.round(logoW * padFX)
      const padY = Math.round(logoH * padFY)
      W = logoW + 2 * padX
      H = logoH + 2 * padY
      cx = W / 2
      cy = H / 2
      maxR = Math.min(W, H) / 2

      canvas.width = Math.floor(W * dpr)
      canvas.height = Math.floor(H * dpr)
      canvas.style.width = W + "px"
      canvas.style.height = H + "px"

      const off = document.createElement("canvas")
      off.width = W
      off.height = H
      const octx = off.getContext("2d")
      if (!octx) return
      octx.drawImage(img, padX, padY, logoW, logoH)
      const data = octx.getImageData(0, 0, W, H).data

      const step = logoW > 340 ? 4 : 3
      const maxDist = Math.min(padX, padY) * 1.5
      particles = []
      for (let y = 0; y < H; y += step) {
        for (let x = 0; x < W; x += step) {
          const i = (y * W + x) * 4
          if (data[i + 3] > 120 && Math.random() < 0.9) {
            const u = Math.pow(Math.random(), 1.5)
            let dist = 20 + u * maxDist
            if (Math.random() < 0.1) dist *= 1.4
            particles.push({
              hx: x + rnd(-step * 0.5, step * 0.5),
              hy: y + rnd(-step * 0.5, step * 0.5),
              r: data[i], g: data[i + 1], b: data[i + 2],
              a: rnd(0.7, 1),
              ang: Math.random() * Math.PI * 2,
              dist,
              curl: rnd(-3.4, 3.4),
              phase: Math.random() * Math.PI * 2,
              speed: rnd(0.4, 1.5),
              size: step * rnd(0.28, 1),
              delay: clamp01(Math.hypot(x - cx, y - cy) / maxR * 0.5 + Math.random() * 0.6),
            })
          }
        }
      }
      start = performance.now()
      cancelAnimationFrame(raf)
      loop()
    }

    function loop() {
      if (!ctx) return
      const elapsed = performance.now() - start
      const d = disp(elapsed)
      const t = elapsed / 1000
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)

      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR)
      glow.addColorStop(0, "rgba(214,176,128," + (0.2 + 0.05 * Math.sin(t * 0.9)) + ")")
      glow.addColorStop(0.4, "rgba(234,225,206,0.05)")
      glow.addColorStop(1, "rgba(0,0,0,0)")
      ctx.globalAlpha = 1
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, W, H)

      for (let k = 0; k < particles.length; k++) {
        const pt = particles[k]
        const de = smooth(clamp01((d - pt.delay * spread) / (1 - spread)))
        const ang = pt.ang + de * pt.curl
        const rad = pt.dist * de
        const driftX = Math.cos(t * pt.speed + pt.phase) * 12 * de
        const driftY = Math.sin(t * pt.speed + pt.phase * 1.3) * 12 * de
        const x = pt.hx + Math.cos(ang) * rad + driftX
        const y = pt.hy + Math.sin(ang) * rad + driftY
        const edge = smooth(clamp01((maxR - Math.hypot(x - cx, y - cy)) / (maxR * 0.32)))
        const twinkle = 1 - de * 0.22 * (0.5 + 0.5 * Math.sin(t * pt.speed * 2 + pt.phase))
        ctx.globalAlpha = pt.a * (1 - de * 0.15) * twinkle * edge
        ctx.fillStyle = "rgb(" + pt.r + "," + pt.g + "," + pt.b + ")"
        ctx.beginPath()
        ctx.arc(x, y, pt.size, 0, Math.PI * 2)
        ctx.fill()
      }
      raf = requestAnimationFrame(loop)
    }

    return () => cancelAnimationFrame(raf)
  }, [src, maxWidth])

  return <canvas ref={canvasRef} className={className} role="img" aria-label="Trocooony" />
}

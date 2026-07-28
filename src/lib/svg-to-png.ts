// Rasterizes an SVG in the browser so a vision model can actually look at it.
// The server never renders anything, which keeps this deployable on Vercel.

// An SVG loaded as an image file must declare its namespace and its intrinsic
// size. Inline SVG in a page does not need either, so worker output often omits
// both and silently fails to rasterize.
function normalizeSvg(svg: string, size: number): string {
  let s = svg.trim()
  const head = s.slice(0, 400)
  if (!/xmlns\s*=/i.test(head)) {
    s = s.replace(/^<svg/i, '<svg xmlns="http://www.w3.org/2000/svg"')
  }
  if (!/<svg[^>]*\swidth\s*=/i.test(s.slice(0, 400))) {
    s = s.replace(/^<svg/i, '<svg width="' + size + '" height="' + size + '"')
  }
  return s
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

export async function svgToPngBase64(svg: string, size = 512): Promise<string | null> {
  try {
    if (typeof window === "undefined") return null
    const normalized = normalizeSvg(svg, size)

    // A data URL is the most reliable source. A blob URL is the fallback.
    const dataUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(normalized)
    let img = await loadImage(dataUrl)
    let objectUrl = ""
    if (!img) {
      objectUrl = URL.createObjectURL(new Blob([normalized], { type: "image/svg+xml;charset=utf-8" }))
      img = await loadImage(objectUrl)
    }
    if (!img) {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      return null
    }

    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      return null
    }
    ctx.fillStyle = "#FFFFFF"
    ctx.fillRect(0, 0, size, size)
    ctx.drawImage(img, 0, 0, size, size)
    if (objectUrl) URL.revokeObjectURL(objectUrl)

    const png = canvas.toDataURL("image/png")
    return png.split(",")[1] || null
  } catch {
    return null
  }
}

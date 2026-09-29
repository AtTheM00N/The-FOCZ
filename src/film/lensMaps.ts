let maps: { lens: string; ripple: string } | undefined

/** Small immutable normal fields; only their SVG positions change at runtime. */
export function lensMaps() {
  if (maps) return maps
  const create = (ring: boolean) => {
    const size = 256, canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const context = canvas.getContext('2d')
    if (!context) return ''
    const pixels = context.createImageData(size, size)
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const nx = (x + .5) / size * 2 - 1, ny = (y + .5) / size * 2 - 1
      const radius = Math.hypot(nx, ny), index = (y * size + x) * 4
      const field = ring
        ? Math.sin((radius - .7) * 28) * Math.exp(-(((radius - .7) / .12) ** 2)) * .4
        : radius < 1 ? -Math.pow(1 - radius * radius, .65) : 0
      pixels.data[index] = 128 + nx * field * 124
      pixels.data[index + 1] = 128 + ny * field * 124
      pixels.data[index + 2] = 128
      pixels.data[index + 3] = 255
    }
    context.putImageData(pixels, 0, 0)
    return canvas.toDataURL()
  }
  maps = { lens: create(false), ripple: create(true) }
  return maps
}

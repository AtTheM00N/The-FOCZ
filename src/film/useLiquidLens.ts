import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import gsap from 'gsap'
import { lensMaps } from './lensMaps'

interface LensElements {
  button: RefObject<HTMLButtonElement | null>; text: RefObject<HTMLSpanElement | null>
  glass: RefObject<HTMLSpanElement | null>; ripple: RefObject<HTMLSpanElement | null>
  filter: RefObject<SVGFilterElement | null>
  lensImage: RefObject<SVGFEImageElement | null>; rippleImage: RefObject<SVGFEImageElement | null>
  lensScale: RefObject<SVGFEDisplacementMapElement | null>; rippleScale: RefObject<SVGFEDisplacementMapElement | null>
}

export function useLiquidLens(elements: LensElements, { id, disabled, reduced }: { id: string; disabled: boolean; reduced: boolean }) {
  const activate = useRef<((keyboard: boolean) => void) | null>(null)
  const refs = useRef(elements)
  useEffect(() => {
    const { button, text, glass, ripple, filter, lensImage, rippleImage, lensScale, rippleScale } = refs.current
    const target = button.current!, glyphs = text.current!, lens = glass.current!, wave = ripple.current!
    if (disabled || reduced) { glyphs.style.filter = 'none'; return }
    const maps = lensMaps()
    if (!maps.lens || !maps.ripple) return
    lensImage.current!.setAttribute('href', maps.lens)
    rippleImage.current!.setAttribute('href', maps.ripple)
    let width = 1, height = 1, radius = 1, running = false, hovering = false, held = false, keyboardFocus = false
    let touch = false, pointerId = -1, alive = true
    let x = 0, y = 0, tx = 0, ty = 0, vx = 0, vy = 0, visibility = 0, pressure = 0
    let pulseAt = -10000, pulseX = 0, pulseY = 0
    const position = (image: SVGFEImageElement, cx: number, cy: number, w: number, h: number) => {
      image.setAttribute('x', String(cx - w / 2)); image.setAttribute('y', String(cy - h / 2))
      image.setAttribute('width', String(w)); image.setAttribute('height', String(h))
    }
    const measure = () => {
      width = glyphs.offsetWidth; height = glyphs.offsetHeight
      radius = Math.max(30, Math.min(112, height * .54))
      lens.style.left = wave.style.left = `${glyphs.offsetLeft}px`
      lens.style.top = wave.style.top = `${glyphs.offsetTop}px`
      filter.current!.setAttribute('width', String(width + 64)); filter.current!.setAttribute('height', String(height + 64))
      if (!running) { x = tx = width / 2; y = ty = height / 2 }
      else {
        tx = keyboardFocus ? width / 2 : Math.max(0, Math.min(width, tx))
        ty = keyboardFocus ? height / 2 : Math.max(0, Math.min(height, ty))
        x = Math.max(0, Math.min(width, x)); y = Math.max(0, Math.min(height, y))
        pulseX = Math.max(0, Math.min(width, pulseX)); pulseY = Math.max(0, Math.min(height, pulseY))
      }
    }
    const stop = () => {
      gsap.ticker.remove(tick); running = false
      glyphs.style.filter = 'none'; lens.style.opacity = wave.style.opacity = '0'
    }
    const reset = () => {
      hovering = held = keyboardFocus = false; pointerId = -1
      visibility = pressure = vx = vy = 0; pulseAt = -10000; stop()
    }
    const tick = (_time: number, delta: number) => {
      const dt = Math.min(delta / 1000, .032), blend = 1 - Math.exp(-dt * 12)
      vx += ((tx - x) * 165 - vx * 23) * dt; vy += ((ty - y) * 165 - vy * 23) * dt
      x += vx * dt; y += vy * dt
      const pulse = Math.max(0, 1 - (performance.now() - pulseAt) / 850)
      const shown = hovering || held || keyboardFocus ? 1 : 0
      visibility += (shown - visibility) * blend; pressure += ((held ? 1 : 0) - pressure) * blend
      const stretch = Math.min(.12, Math.hypot(vx, vy) / 2800)
      const angle = Math.atan2(vy, vx), sx = 1 + stretch, sy = 1 - stretch * .5
      // Refraction stays in a single lens; the actual font metrics never move.
      position(lensImage.current!, x, y, radius * 2 * sx, radius * 2 * sy)
      lensScale.current!.setAttribute('scale', String((radius * .3 + pressure * radius * .22) * visibility))
      const expansion = 1 + (1 - pulse) * 1.8, diameter = radius * 2 * expansion
      position(rippleImage.current!, pulseX, pulseY, diameter, diameter)
      rippleScale.current!.setAttribute('scale', String(radius * .16 * Math.sin(pulse * Math.PI) ** 2))
      lens.style.width = lens.style.height = `${radius * 2}px`
      lens.style.opacity = String(visibility * (.55 + pressure * .25))
      lens.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%) rotate(${angle}rad) scale(${sx},${sy})`
      wave.style.width = wave.style.height = `${diameter * .7}px`
      wave.style.transform = `translate(${pulseX}px,${pulseY}px) translate(-50%,-50%)`
      wave.style.opacity = String(Math.sin(pulse * Math.PI) ** 2 * .3)
      if (!shown && visibility < .002 && pulse === 0) stop()
      else if (pulse === 0 && Math.hypot(tx - x, ty - y, vx, vy) < .02 && Math.abs(shown - visibility) < .001 && Math.abs((held ? 1 : 0) - pressure) < .001) {
        // Keep a settled lens visible without running a continuous animation.
        gsap.ticker.remove(tick); running = false
      }
    }
    const wake = () => {
      if (running) return
      glyphs.style.filter = `url(#${id})`; running = true; gsap.ticker.add(tick)
    }
    const point = (event: PointerEvent) => {
      const rect = glyphs.getBoundingClientRect()
      tx = Math.max(0, Math.min(width, event.clientX - rect.left))
      ty = Math.max(0, Math.min(height, event.clientY - rect.top))
    }
    const enter = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      point(event); if (!running) { x = tx; y = ty }; hovering = true; wake()
    }
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch' && !held) return
      if (event.pointerType !== 'touch') hovering = true
      point(event); wake()
    }
    const leave = () => { hovering = false; held = false; pointerId = -1; wake() }
    const down = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return
      touch = event.pointerType === 'touch'; pointerId = event.pointerId
      point(event); if (!running) { x = tx; y = ty }; held = true; wake()
    }
    const up = (event: PointerEvent) => {
      if (event.pointerId !== pointerId) return
      held = false; pointerId = -1
      if (touch) hovering = false
      wake()
    }
    const cancel = () => reset()
    const focus = () => {
      keyboardFocus = target.matches(':focus-visible')
      if (keyboardFocus) { tx = width / 2; ty = height / 2; wake() }
    }
    const visibilityChange = () => { if (document.hidden) reset() }
    activate.current = keyboard => {
      if (keyboard) { tx = width / 2; ty = height / 2; x = tx; y = ty }
      pulseX = x; pulseY = y; pulseAt = performance.now(); wake()
    }
    const resize = new ResizeObserver(measure); resize.observe(glyphs)
    document.fonts.ready.then(() => { if (alive) measure() })
    measure()
    target.addEventListener('pointerenter', enter); target.addEventListener('pointermove', move)
    target.addEventListener('pointerleave', leave); target.addEventListener('pointerdown', down)
    target.addEventListener('pointercancel', cancel); target.addEventListener('focus', focus); target.addEventListener('blur', reset)
    window.addEventListener('pointerup', up); window.addEventListener('blur', reset)
    document.addEventListener('visibilitychange', visibilityChange)
    return () => {
      alive = false; activate.current = null; reset(); resize.disconnect()
      target.removeEventListener('pointerenter', enter); target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerleave', leave); target.removeEventListener('pointerdown', down)
      target.removeEventListener('pointercancel', cancel); target.removeEventListener('focus', focus); target.removeEventListener('blur', reset)
      window.removeEventListener('pointerup', up); window.removeEventListener('blur', reset)
      document.removeEventListener('visibilitychange', visibilityChange)
    }
  }, [id, disabled, reduced])
  return activate
}

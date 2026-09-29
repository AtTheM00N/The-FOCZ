import { useEffect, useState } from 'react'
import type { RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from '@studio-freight/lenis'

gsap.registerPlugin(ScrollTrigger)

/** Film controls and document links use the same scroll owner as the wheel. */
export function seekPage(top: number) {
  window.dispatchEvent(new CustomEvent('focz:seek', { detail: top }))
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const change = () => setReduced(media.matches)
    media.addEventListener('change', change)
    return () => media.removeEventListener('change', change)
  }, [])
  return reduced
}

export function useExperience(root: RefObject<HTMLElement | null>, reduced: boolean) {
  useEffect(() => {
    if (!root.current) return
    // GSAP supplies seconds; Lenis expects milliseconds. Only one scroll clock.
    const lenis = reduced ? null : new Lenis({ duration: 0.9, smoothWheel: true, syncTouch: false })
    const tick = (time: number) => lenis?.raf(time * 1000)
    if (lenis) {
      lenis.on('scroll', ScrollTrigger.update)
      gsap.ticker.add(tick)
      gsap.ticker.lagSmoothing(0)
    }
    const context = gsap.context(() => {
      if (!reduced) {
        gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach(element => {
          gsap.from(element, { y: 18, opacity: 0, duration: 0.55, ease: 'power2.out', scrollTrigger: { trigger: element, start: 'top 94%', once: true } })
        })
      }
    }, root)
    const refresh = () => { lenis?.resize(); ScrollTrigger.refresh() }
    const seek = (event: Event) => {
      const top = (event as CustomEvent<number>).detail
      if (!Number.isFinite(top)) return
      if (lenis) { lenis.resize(); lenis.scrollTo(top, { immediate: true, force: true }) }
      else window.scrollTo({ top, behavior: 'instant' })
    }
    const anchor = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = (event.target as Element).closest<HTMLAnchorElement>('a[href^="#"]')
      if (!link || link.target || link.hasAttribute('download') || link.hash.length < 2) return
      const target = document.getElementById(decodeURIComponent(link.hash.slice(1)))
      if (!target) return
      event.preventDefault()
      history.pushState(null, '', link.hash)
      const focus = () => {
        if (!target.hasAttribute('tabindex')) { target.setAttribute('tabindex', '-1'); target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true }) }
        target.focus({ preventScroll: true })
      }
      if (lenis) {
        // Native focus and viewport resizing can move the page before Lenis catches up.
        const top = target.getBoundingClientRect().top + window.scrollY - 24
        lenis.resize()
        lenis.scrollTo(window.scrollY, { immediate: true, force: true })
        lenis.scrollTo(top, { duration: .9, onComplete: focus })
      }
      else { target.scrollIntoView({ behavior: 'instant' }); focus() }
    }
    document.fonts.ready.then(() => { if (active) refresh() })
    let active = true
    window.addEventListener('load', refresh)
    window.addEventListener('focz:seek', seek)
    document.addEventListener('click', anchor)
    return () => {
      active = false
      window.removeEventListener('load', refresh)
      window.removeEventListener('focz:seek', seek)
      document.removeEventListener('click', anchor)
      context.revert()
      gsap.ticker.remove(tick)
      lenis?.destroy()
    }
  }, [root, reduced])
}

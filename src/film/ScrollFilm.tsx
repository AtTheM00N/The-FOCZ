import { Component, lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import gsap from 'gsap'
import { Brand, Arrow } from '../components/Brand'
import { product, worlds } from '../data'
import { seekPage } from '../useExperience'
import { FilmSound } from './FilmSound'
import { LiquidWordmark } from './LiquidWordmark'
import { createFilmInteraction, pulseInteraction } from './interaction'
import { clamp01, dewReveal, environmentAt, finaleAt, SHOTS, shotAt, smooth, windowed, worldWeights } from './timeline'
import type { FilmSignal } from './timeline'
import './film.css'

const FilmScene = lazy(() => import('./FilmScene'))

class SceneLoaderBoundary extends Component<{ children: ReactNode; onUnavailable: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onUnavailable() }
  render() { return this.state.failed ? null : this.props.children }
}

function FocusIcon() {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true"><path d="M8 5H5v3m11-3h3v3M5 16v3h3m11-3v3h-3" stroke="currentColor" strokeWidth="1" /><circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1" /></svg>
}

export default function ScrollFilm({ reduced }: { reduced: boolean }) {
  const track = useRef<HTMLElement>(null), stage = useRef<HTMLDivElement>(null)
  const signal = useRef<FilmSignal>({ progress: 0, velocity: 0, visible: true })
  const interaction = useRef(createFilmInteraction())
  const sound = useRef<FilmSound | null>(null)
  const bounds = useRef({ top: 0, distance: 1 })
  const [loaded, setLoaded] = useState(false), [fonts, setFonts] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const calmRef = useRef(reduced)
  const [chapter, setChapter] = useState(0), [world, setWorld] = useState(-1)
  const [audioOn, setAudioOn] = useState(false), [audioError, setAudioError] = useState(false)
  const onReady = useCallback(() => setLoaded(true), [])
  const onUnavailable = useCallback(() => setUnavailable(true), [])
  const focusSound = useCallback(() => sound.current?.focus(), [])
  const focusCan = useCallback(() => {
    pulseInteraction(interaction.current)
    focusSound()
  }, [focusSound])
  const seek = useCallback((progress: number) => {
    seekPage(bounds.current.top + clamp01(progress) * bounds.current.distance)
  }, [])
  const seekChapter = (index: number) => seek(index === 0 ? 0 : index === SHOTS.length - 1 ? .995 : (SHOTS[index].at + SHOTS[index + 1].at) / 2)
  useLayoutEffect(() => { calmRef.current = reduced }, [reduced])

  useEffect(() => {
    let active = true
    document.fonts.ready.then(() => { if (active) setFonts(true) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const element = track.current!
    const score = new FilmSound(); sound.current = score
    let intersecting = true, previous = -1, previousChapter = -1, previousWorld = -2, previousCalm = calmRef.current
    const measure = () => {
      const rect = element.getBoundingClientRect()
      bounds.current = { top: rect.top + window.scrollY, distance: Math.max(1, rect.height - window.innerHeight) }
    }
    const visibility = () => { signal.current.visible = intersecting && !document.hidden }
    const observer = new IntersectionObserver(entries => { intersecting = entries[0].isIntersecting; visibility() })
    observer.observe(element)
    const resize = new ResizeObserver(measure); resize.observe(element)
    measure()
    const tick = (_time: number, delta: number) => {
      const p = clamp01((window.scrollY - bounds.current.top) / bounds.current.distance)
      const shot = shotAt(p), environment = environmentAt(p)
      const cinematic = calmRef.current ? Math.min(.985, (SHOTS[shot].at + (SHOTS[shot + 1]?.at ?? 1)) / 2) : p
      signal.current.velocity = previous < 0 ? 0 : (p - previous) / Math.max(delta / 1000, .001)
      signal.current.progress = cinematic
      score.update(p, signal.current.velocity, signal.current.visible)
      if (p === previous && previousCalm === calmRef.current) return
      previous = p; previousCalm = calmRef.current
      if (shot !== previousChapter) { setChapter(shot); previousChapter = shot }
      if (environment !== previousWorld) { setWorld(environment); previousWorld = environment }
      const style = stage.current!.style
      const [snow, water, terrain] = worldWeights(cinematic)
      const finale = finaleAt(p)
      style.setProperty('--intro', String(1 - smooth(.012, .055, p)))
      style.setProperty('--product-copy', String(windowed(.53, .56, .845, .875, p)))
      style.setProperty('--world-snow', String(snow))
      style.setProperty('--world-water', String(water))
      style.setProperty('--world-terrain', String(terrain))
      style.setProperty('--dew-reveal', String(dewReveal(cinematic)))
      style.setProperty('--quiet', String(finale.quiet))
      style.setProperty('--lock-in', String(finale.lockIn))
      style.setProperty('--focz', String(finale.focz))
      style.setProperty('--ending', String(finale.ending))
      style.setProperty('--progress', String(p))
    }
    gsap.ticker.add(tick)
    window.addEventListener('resize', measure)
    document.addEventListener('visibilitychange', visibility)
    return () => {
      gsap.ticker.remove(tick); observer.disconnect(); resize.disconnect(); score.dispose(); sound.current = null
      window.removeEventListener('resize', measure)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [])

  const toggleSound = async () => {
    const enabled = await sound.current?.toggle() ?? false
    setAudioOn(enabled); setAudioError(!enabled && !audioOn)
  }
  const sceneVisible = !unavailable && loaded
  const worldCopy = world >= 0 ? worlds[world] : null

  return <section id="top" ref={track} className={`film-track${reduced ? ' is-calm' : ''}${unavailable ? ' is-fallback' : ''}`} aria-label="An interactive FOCZ product film">
    <div className={`film-stage${sceneVisible ? ' is-ready' : ''}`} ref={stage}>
      <div className="film-image">{unavailable ? <div className="film-fallback"><img src="/focz/product.png" alt="FOCZ Tropical Punch energy drink" /><div><h1><Brand /></h1><p>{product.name}<br />{product.volume}</p><a className="button button-white" href="#formula">Ingredients <Arrow /></a></div></div> : fonts && <SceneLoaderBoundary onUnavailable={onUnavailable}><Suspense fallback={null}><FilmScene signal={signal} interaction={interaction} onFocus={focusSound} reduced={reduced} onReady={onReady} onUnavailable={onUnavailable} /></Suspense></SceneLoaderBoundary>}</div>
      {!unavailable && <div className="film-world-image" aria-hidden="true">{worlds.map(item => <div key={item.name} className={`film-world-layer film-world-${item.image}`}><div className="film-world-crop" /></div>)}</div>}
      {!unavailable && <div className="film-intro-backdrop" aria-hidden="true" />}
      <div className="film-vignette" aria-hidden="true" />
      <header className="film-header">
        <a href="#top" aria-label="FOCZ home"><Brand /></a>
        <div className="film-header-actions"><button className={`film-sound${audioOn ? ' is-on' : ''}`} onClick={toggleSound} aria-pressed={audioOn} aria-label={audioOn ? 'Turn sound off' : 'Turn sound on'}><span className="sound-lines" aria-hidden="true"><i /><i /><i /><i /></span><span>{audioOn ? 'Sound on' : 'Sound off'}</span></button><a href="#formula">Skip film <Arrow diagonal /></a></div>
      </header>
      {audioError && <p className="audio-status" role="status">Sound unavailable.</p>}
      {!unavailable && <>
        <div className="film-intro" aria-hidden={chapter > 0} inert={chapter > 0}>
          <h1><LiquidWordmark disabled={chapter > 0} reduced={reduced} onActivate={focusCan} /></h1>
          <p className="mono"><span>{product.name}</span><span>{product.volume}</span></p>
          <span className="film-scroll" aria-label={loaded ? 'Scroll to explore' : 'Loading the film'}>{loaded ? '↓' : '·'}</span>
        </div>
        <div className="film-product-copy" aria-hidden={chapter < 6 || chapter > 9}>
          {!worldCopy && <span className="film-kicker">Cognitive fuel</span>}
          <p>{worldCopy?.name ?? product.name}</p>
        </div>
        <div className="film-silence" aria-hidden="true"><span className="lock-in">LOCK IN.</span><span className="focus-wordmark"><Brand /></span></div>
        <div className="film-ending" inert={chapter !== 11} aria-hidden={chapter !== 11}>
          <div><h2><Brand /></h2><p>Coming soon.</p></div>
          <div className="film-ending-actions"><a href="#launch" className="button button-white">Join the list <Arrow diagonal /></a><a href="#formula" className="film-text-link">Ingredients <Arrow /></a><button className="film-replay" onClick={() => seek(0)}>Replay ↶</button></div>
        </div>
        <p className="film-credit" aria-hidden={chapter !== 11}>A prototype by insert_name studios</p>
        <nav className="film-navigation" aria-label="Film chapters">
          <ol className="film-markers">{SHOTS.map((shot, i) => <li key={shot.name}><button type="button" onClick={() => seekChapter(i)} aria-label={`Go to ${shot.name}`} aria-current={chapter === i ? 'step' : undefined}><span className="chapter-tick" aria-hidden="true" /><span className="chapter-tooltip" aria-hidden="true">{shot.name}</span></button></li>)}</ol>
          <div className="film-scene-control"><label className="sr-only" htmlFor="film-scene">Film scene</label><select id="film-scene" value={chapter} onChange={event => seekChapter(Number(event.target.value))}>{SHOTS.map((shot, i) => <option key={shot.name} value={i}>{shot.name}</option>)}</select></div>
          <button type="button" className="film-focus-button" aria-label="Focus the can" title="Focus the can" onClick={focusCan} disabled={chapter < 2 || chapter > 9}><FocusIcon /></button>
        </nav>
        <div className="film-progress" aria-hidden="true"><span /></div>
      </>}
    </div>
  </section>
}

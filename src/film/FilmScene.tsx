import { Component, Suspense, useEffect, useMemo, useRef } from 'react'
import type { ReactNode, RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import gsap from 'gsap'
import { CanvasTexture, ExtrudeGeometry, Path, RepeatWrapping, Shape, SRGBColorSpace, Vector3 } from 'three'
import type { DirectionalLight, Group, MeshBasicMaterial, MeshPhysicalMaterial, PerspectiveCamera, SpotLight } from 'three'
import { product } from '../data'
import { cameraAt, smooth, windowed } from './timeline'
import type { FilmSignal } from './timeline'
import Condensation from './Condensation'
import { hoverInteraction, pulseInteraction } from './interaction'
import type { FilmInteraction } from './interaction'

type Props = { signal: RefObject<FilmSignal>; interaction: RefObject<FilmInteraction>; reduced: boolean; onFocus: () => void; onReady: () => void; onUnavailable: () => void }
const metal = { color: '#c3c7c6', metalness: 1, roughness: .2 }

function makeLabel() {
  const canvas = document.createElement('canvas')
  canvas.width = 2048; canvas.height = 2048
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#e9eae9'; ctx.fillRect(0, 0, 2048, 2048)
  // Deterministic printed grain, generated once. No per-frame texture work.
  let seed = 137
  for (let i = 0; i < 22000; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    const x = seed % 2048; seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    ctx.fillStyle = i % 3 ? '#dfe1df' : '#cdd0ce'; ctx.fillRect(x, seed % 2048, 1, 2)
  }
  ctx.fillStyle = '#08090a'
  ctx.save(); ctx.translate(947, 1030); ctx.rotate(-Math.PI / 2)
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.font = '700 350px "Geist Variable",sans-serif'; ctx.fillText('FOCZ', 0, 0); ctx.restore()
  ctx.font = '500 29px "Geist Mono Variable",monospace'
  ctx.fillText('FOCUS.', 1140, 490); ctx.fillText('ENERGY.', 1140, 534); ctx.fillText('ELEVATED.', 1140, 578)
  ctx.font = '600 38px "Geist Variable",sans-serif'
  ctx.fillText('COGNITIVE', 1140, 710); ctx.fillText('FUEL', 1140, 754)
  ctx.font = '400 24px "Geist Mono Variable",monospace'; ctx.fillText('CALIBRATED DOSE', 1140, 798)
  ctx.strokeStyle = '#8a9092'; ctx.lineWidth = 2; ctx.strokeRect(1110, 850, 390, 690)
  ctx.font = '600 40px "Geist Variable",sans-serif'; ctx.fillText('TROPICAL', 1140, 922); ctx.fillText('PUNCH', 1140, 968)
  ctx.beginPath(); ctx.moveTo(1110, 1015); ctx.lineTo(1500, 1015); ctx.stroke()
  ctx.font = '500 25px "Geist Mono Variable",monospace'
  const lines = ['ALPHA-GPC', 'L-TYROSINE', 'L-THEANINE', 'B VITAMINS', 'COMPLEX', 'POTASSIUM']
  lines.forEach((line, i) => ctx.fillText(line, 1140, 1085 + i * 65))
  ctx.font = '400 23px "Geist Mono Variable",monospace'; ctx.fillText('ENERGY DRINK', 1140, 1650); ctx.fillText('BOISSON ÉNERGISANTE', 1140, 1685)
  ctx.font = '500 37px "Geist Mono Variable",monospace'; ctx.fillText(product.volume, 1140, 1805)
  const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace; texture.anisotropy = 4
  return texture
}

function makeSurface() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256
  const ctx = c.getContext('2d')!, pixels = ctx.createImageData(256, 256)
  let n = 99
  for (let i = 0; i < pixels.data.length; i += 4) { n = (Math.imul(n, 1103515245) + 12345) >>> 0; const v = 105 + n % 48; pixels.data[i] = v; pixels.data[i + 1] = v; pixels.data[i + 2] = v; pixels.data[i + 3] = 255 }
  ctx.putImageData(pixels, 0, 0)
  const map = new CanvasTexture(c); map.wrapS = map.wrapT = RepeatWrapping; map.repeat.set(7, 9)
  return map
}

function lidTab() {
  const shape = new Shape(); shape.absellipse(0, 0, .102, .195, 0, Math.PI * 2, false, 0)
  const hole = new Path(); hole.absellipse(0, -.047, .057, .103, 0, Math.PI * 2, true, 0); shape.holes.push(hole)
  return new ExtrudeGeometry(shape, { depth: .014, steps: 1, bevelEnabled: true, bevelSize: .004, bevelThickness: .004, bevelSegments: 2, curveSegments: 32 })
}

function Product({ signal, interaction, onFocus, reduced }: Pick<Props, 'signal' | 'interaction' | 'onFocus' | 'reduced'>) {
  const ref = useRef<Group>(null), coating = useRef<MeshPhysicalMaterial>(null)
  const { size, gl, invalidate, pointer } = useThree(), mobile = size.width < 760
  const texture = useMemo(() => makeLabel(), [])
  const surface = useMemo(() => makeSurface(), []), tab = useMemo(() => lidTab(), [])
  const optics = useRef({ uFocusAge: { value: 10 }, uFocusPoint: { value: new Vector3() } })
  const local = useMemo(() => new Vector3(), [])
  useEffect(() => {
    const material = coating.current!
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, optics.current)
      shader.vertexShader = `varying vec3 vSurfacePosition;\n${shader.vertexShader}`.replace('#include <begin_vertex>', '#include <begin_vertex>\nvSurfacePosition=position;')
      shader.fragmentShader = `varying vec3 vSurfacePosition; uniform float uFocusAge; uniform vec3 uFocusPoint;\n${shader.fragmentShader}`
        .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
          float focusDistance=length(vSurfacePosition-uFocusPoint);
          float focusSweep=exp(-pow((focusDistance-uFocusAge*.95)/.15,2.))*(1.-smoothstep(.25,1.35,uFocusAge));
          roughnessFactor *= 1.-focusSweep*.32;`)
        .replace('#include <opaque_fragment>', 'outgoingLight += vec3(.055)*focusSweep;\n#include <opaque_fragment>')
    }
    material.customProgramCacheKey = () => 'focz-focus-surface-v1'
    material.needsUpdate = true
    return () => { gl.domElement.style.removeProperty('cursor') }
  }, [optics, gl])
  useEffect(() => () => { texture.dispose(); surface.dispose(); tab.dispose() }, [texture, surface, tab])
  useFrame(({ camera }) => {
    const p = signal.current.progress
    if (!ref.current) return
    ref.current.rotation.y = Math.atan2(camera.position.x, camera.position.z) * smooth(.18, .52, p)
    ref.current.rotation.z = 0
    ref.current.position.y = 0
    optics.current.uFocusAge.value = reduced ? 10 : Math.max(0, performance.now() / 1000 - interaction.current.pulseAt)
    optics.current.uFocusPoint.value.fromArray(interaction.current.pulsePoint)
  })
  const point = (event: ThreeEvent<PointerEvent | MouseEvent>) => {
    event.stopPropagation()
    local.copy(event.point); ref.current!.worldToLocal(local)
    hoverInteraction(interaction.current, true, local.toArray() as [number, number, number], [pointer.x, pointer.y])
  }
  const hover = (event: ThreeEvent<PointerEvent>) => {
    point(event)
    gl.domElement.style.setProperty('cursor', 'crosshair'); invalidate()
  }
  const leave = () => { hoverInteraction(interaction.current, false); gl.domElement.style.removeProperty('cursor'); invalidate() }
  return <group ref={ref} onPointerMove={hover} onPointerOut={leave} onClick={event => { point(event); pulseInteraction(interaction.current); onFocus(); invalidate() }}>
    <mesh><cylinderGeometry args={[.53, .53, 2.64, 64, 1, true, Math.PI]} /><meshPhysicalMaterial ref={coating} map={texture} metalness={.18} roughness={.4} clearcoat={.12} clearcoatRoughness={.28} bumpMap={surface} bumpScale={.00035} envMapIntensity={1.2} /></mesh>
    {[-1, 1].map(side => <group key={side} position={[0, side * 1.34, 0]}>
      <mesh><cylinderGeometry args={side > 0 ? [.475, .53, .12, 64] : [.53, .476, .12, 64]} /><meshStandardMaterial {...metal} color="#8b9198" roughness={.28} /></mesh>
      <mesh position={[0, side * .069, 0]}><cylinderGeometry args={[.48, .48, .027, 64]} /><meshStandardMaterial {...metal} bumpMap={surface} bumpScale={.00045} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, side * .083, 0]}><torusGeometry args={[.483, .018, 8, 96]} /><meshStandardMaterial {...metal} roughness={.12} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, side * .085, 0]}><torusGeometry args={[.429, .006, 5, 64]} /><meshStandardMaterial {...metal} color="#727b86" /></mesh>
    </group>)}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.428, -.22]} scale={[.12, .16, 1]}><circleGeometry args={[1, 32]} /><meshStandardMaterial color="#111317" metalness={.7} roughness={.32} /></mesh>
    <mesh geometry={tab} rotation={[-Math.PI / 2, 0, .1]} position={[0, 1.447, .055]}><meshStandardMaterial {...metal} roughness={.18} bumpMap={surface} bumpScale={.0003} /></mesh>
    <mesh position={[0, 1.448, .058]}><sphereGeometry args={[.027, 16, 8]} /><meshStandardMaterial {...metal} roughness={.16} /></mesh>
    <Condensation label={texture} mobile={mobile} signal={signal} interaction={interaction} reduced={reduced} />
  </group>
}

function QuietField({ signal }: Pick<Props, 'signal'>) {
  const lines = useRef<Group>(null), line = useRef<MeshBasicMaterial>(null), other = useRef<MeshBasicMaterial>(null), horizon = useRef<MeshBasicMaterial>(null)
  useFrame(() => {
    const p = signal.current.progress
    const align = smooth(.22, .34, p), presence = windowed(.205, .245, .43, .52, p)
    if (lines.current) {
      lines.current.visible = presence > .001
      lines.current.children.forEach((mark, i) => { mark.position.x = (i ? 1 : -1) * (.96 - align * .34) })
    }
    if (line.current) line.current.opacity = presence * .22
    if (other.current) other.current.opacity = presence * .22
    if (horizon.current) horizon.current.opacity = windowed(.445, .49, .61, .67, p) * .14
  })
  return <>
    <group ref={lines} position={[0, 0, -.6]}>
      <mesh><planeGeometry args={[.003, 2.25]} /><meshBasicMaterial ref={line} color="#c3c7c6" transparent depthWrite={false} /></mesh>
      <mesh><planeGeometry args={[.003, 2.25]} /><meshBasicMaterial ref={other} color="#c3c7c6" transparent depthWrite={false} /></mesh>
    </group>
    <mesh position={[0, .18, -2.8]}><planeGeometry args={[12, .004]} /><meshBasicMaterial ref={horizon} color="#e9eae9" transparent depthWrite={false} /></mesh>
  </>
}
function Stage(props: Props) {
  const { size, invalidate } = useThree()
  const { signal, onReady } = props
  const key = useRef<DirectionalLight>(null), rim = useRef<DirectionalLight>(null), focus = useRef<SpotLight>(null)
  const previousPose = useRef(-1)
  const focal = useMemo(() => new Vector3(), []), rightward = useMemo(() => new Vector3(), [])
  const shadow = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64
    const ctx = canvas.getContext('2d')!, gradient = ctx.createRadialGradient(32, 32, 2, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(0,0,0,.5)'); gradient.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 64, 64)
    return new CanvasTexture(canvas)
  }, [])
  useEffect(() => () => shadow.dispose(), [shadow])
  useEffect(() => {
    let previous = -1
    let warmUntil = 0
    const tick = () => {
      const now = performance.now() / 1000, interaction = props.interaction.current
      if (!props.reduced && interaction.hovered) warmUntil = now + .65
      const responding = !props.reduced && (now < warmUntil || now - interaction.pulseAt < 1.4)
      if (signal.current.visible && (previous !== signal.current.progress || responding)) { previous = signal.current.progress; invalidate() }
    }
    gsap.ticker.add(tick); onReady(); invalidate()
    return () => gsap.ticker.remove(tick)
  }, [signal, onReady, invalidate, props.interaction, props.reduced])
  useFrame(({ camera, gl, events }) => {
    const p = props.signal.current.progress, frame = cameraAt(p), lens = camera as PerspectiveCamera
    focal.fromArray(frame.target); lens.position.fromArray(frame.position)
    if (size.width < 760) {
      lens.position.sub(focal).multiplyScalar(1 + smooth(.32, .54, p) * .68).add(focal)
      rightward.set(lens.position.z, 0, -lens.position.x).normalize()
      const pan = -smooth(.95, .982, p) * .82
      lens.position.addScaledVector(rightward, -pan); focal.addScaledVector(rightward, -pan)
      const lift = windowed(.39, .56, .86, .9, p) * .63
      lens.position.setY(lens.position.y - lift); focal.setY(focal.y - lift)
    } else {
      rightward.set(lens.position.z, 0, -lens.position.x).normalize()
      const pan = windowed(.39, .56, .86, .9, p) * .3
      lens.position.addScaledVector(rightward, -pan); focal.addScaledVector(rightward, -pan)
    }
    lens.fov = frame.fov; lens.lookAt(focal); lens.updateProjectionMatrix(); lens.updateMatrixWorld()
    // Reevaluate a stationary pointer when scrolling moves the subject beneath it.
    if (previousPose.current !== p) { previousPose.current = p; events.update?.() }
    const reveal = smooth(.475, .545, p), discover = smooth(0, .105, p), quiet = smooth(.87, .97, p)
    gl.toneMappingExposure = .25 + discover * .75
    if (key.current) key.current.intensity = (.035 + discover * .85 + reveal * 2.1) * (1 - quiet * .18)
    if (rim.current) rim.current.intensity = .15 + discover * .65 + reveal * 1.2
    const hover = props.interaction.current.hovered && !props.reduced ? 1 : 0
    const [px, py] = props.interaction.current.pointer
    const sweep = windowed(.28, .36, .48, .55, p)
    if (key.current) key.current.position.set(-3 + sweep * 1.4 + px * hover * .9, 4 + py * hover * .6, 5)
    if (focus.current) {
      focus.current.intensity = 7 + sweep * 7
      focus.current.position.x = -.6 + smooth(.28, .52, p) * 1.2 + px * hover * .4
    }
  }, -1)
  return <>
    <fog attach="fog" args={['#08090a', 8, 24]} />
    <ambientLight intensity={.025} />
    <directionalLight ref={key} position={[-3, 4, 5]} intensity={1} color="#e9eae9" />
    <directionalLight ref={rim} position={[3, 1, -2]} intensity={1} color="#c3c7c6" />
    <spotLight ref={focus} position={[0, 3, 2]} angle={.52} penumbra={.6} intensity={20} distance={12} color="#c3c7c6" />
    <Environment frames={1} resolution={size.width < 760 ? 128 : 256} environmentIntensity={.8}>
      <Lightformer intensity={4} position={[-3, 1, 3]} scale={[.8, 7, 1]} rotation={[0, .4, 0]} />
      <Lightformer intensity={3} position={[3, 1, 1]} scale={[.35, 8, 1]} rotation={[0, -.5, 0]} />
      <Lightformer intensity={2} position={[0, 4, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[4, 2, 1]} />
      <Lightformer intensity={.5} position={[0, 0, 5]} scale={[3, 5, 1]} />
    </Environment>
    <Product signal={props.signal} interaction={props.interaction} reduced={props.reduced} onFocus={props.onFocus} /><QuietField signal={props.signal} />
    <mesh position={[0, -1.455, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[3.5, 3.5]} /><meshBasicMaterial map={shadow} transparent depthWrite={false} opacity={.7} /></mesh>
  </>
}

function Unavailable({ notify }: { notify: () => void }) {
  useEffect(notify, [notify])
  return null
}
class FilmBoundary extends Component<{ children: ReactNode; onUnavailable: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <Unavailable notify={this.props.onUnavailable} /> : this.props.children }
}
export default function FilmScene(props: Props) {
  return <FilmBoundary onUnavailable={props.onUnavailable}><Canvas className="cinema-canvas" dpr={[1, 1.5]} gl={{ antialias: false, alpha: true, powerPreference: 'high-performance' }} camera={{ position: [.1, 1.47, .92], fov: 29, near: .025, far: 60 }} frameloop="demand" shadows={false} fallback={<span>The still edition is available below.</span>} aria-hidden="true"><Suspense fallback={null}><Stage {...props} /></Suspense></Canvas></FilmBoundary>
}

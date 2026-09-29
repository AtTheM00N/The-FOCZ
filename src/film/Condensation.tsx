import { useEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { Matrix4, MeshPhysicalMaterial, Object3D, Vector3 } from 'three'
import type { InstancedMesh, Mesh, Texture } from 'three'
import { smooth, windowed, worldWeights } from './timeline'
import type { FilmSignal } from './timeline'
import type { FilmInteraction } from './interaction'

type Props = { label: Texture; mobile: boolean; signal: RefObject<FilmSignal>; interaction: RefObject<FilmInteraction>; reduced: boolean }

/** A dielectric cap, sampling the printed label through its curved surface.
 * This avoids a full-screen transmission pass for every idle frame. */
export default function Condensation({ label, mobile, signal, interaction, reduced }: Props) {
  const beads = useRef<InstancedMesh>(null), trails = useRef<InstancedMesh>(null), hero = useRef<Mesh>(null)
  const count = mobile ? 100 : 220
  const [snow, water, terrain] = useTexture(['/focz/snow.jpg', '/focz/water.jpg', '/focz/terrain.jpg'])
  const uniforms = useRef({
    uLabel: { value: label }, uSnow: { value: snow }, uWater: { value: water }, uTerrain: { value: terrain },
    uWeights: { value: new Vector3(1, 0, 0) }, uPoint: { value: new Vector3() }, uHeroMatrix: { value: new Matrix4() },
    uHover: { value: 0 }, uNarrative: { value: 0 }, uHero: { value: new Vector3() },
    uPulseAge: { value: 10 }, uPulsePoint: { value: new Vector3() },
  })
  const material = useMemo(() => {
    const mat = new MeshPhysicalMaterial({
      color: '#ffffff', metalness: 0, roughness: .035, clearcoat: 1,
      clearcoatRoughness: .018, ior: 1.333, specularIntensity: .8,
      envMapIntensity: 1.2, transparent: true, opacity: .96, depthWrite: false,
    })
    mat.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, uniforms.current)
      shader.vertexShader = `varying vec3 vDewPosition; varying vec3 vDewCenter; varying vec3 vDewLocal; uniform mat4 uHeroMatrix;\n${shader.vertexShader}`
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vDewLocal = position;
          #ifdef USE_INSTANCING
            vDewPosition = (instanceMatrix * vec4(position, 1.)).xyz;
            vDewCenter = (instanceMatrix * vec4(0., 0., 0., 1.)).xyz;
          #else
            vDewPosition = (uHeroMatrix * vec4(position, 1.)).xyz;
            vDewCenter = (uHeroMatrix * vec4(0., 0., 0., 1.)).xyz;
          #endif`)
      shader.fragmentShader = `
        varying vec3 vDewPosition; varying vec3 vDewCenter; varying vec3 vDewLocal;
        uniform sampler2D uLabel, uSnow, uWater, uTerrain;
        uniform vec3 uWeights, uPoint, uHero, uPulsePoint;
        uniform float uHover, uNarrative, uPulseAge;
        ${shader.fragmentShader}`.replace('#include <color_fragment>', `#include <color_fragment>
          vec2 canUv = vec2(fract(atan(vDewPosition.x, vDewPosition.z) / 6.2831853 + .5), vDewPosition.y / 2.64 + .5);
          vec2 centreUv = vec2(fract(atan(vDewCenter.x, vDewCenter.z) / 6.2831853 + .5), vDewCenter.y / 2.64 + .5);
          vec2 bend = canUv-centreUv; bend.x = fract(bend.x+.5)-.5;
          vec3 printed = texture2D(uLabel, centreUv + bend*.45).rgb;
          float edge = smoothstep(.65, 1., length(vDewLocal.xy));
          float proximity = exp(-dot(vDewPosition-uPoint, vDewPosition-uPoint) * 210.);
          float story = exp(-dot(vDewPosition-uHero, vDewPosition-uHero) * 180.);
          vec2 lensOffset = vDewLocal.xy * .055;
          vec3 reflection = texture2D(uSnow, vec2(.88, .37) + lensOffset).rgb * uWeights.x
            + texture2D(uWater, vec2(.5, .07) + lensOffset).rgb * uWeights.y
            + texture2D(uTerrain, vec2(.88, .5) + lensOffset).rgb * uWeights.z;
          float luminance = dot(reflection, vec3(.2126,.7152,.0722));
          float focus = max(proximity * uHover, story * uNarrative);
          diffuseColor.rgb = mix(printed * mix(.98, .86, edge), vec3(luminance), focus * .55);
          vec2 glintVector = (vDewLocal.xy-vec2(-.32,.37))*vec2(9.,15.);
          diffuseColor.rgb += vec3(exp(-dot(glintVector,glintVector))*.2);
          float radius = length(vDewPosition-uPulsePoint);
          float sweep = exp(-pow((radius-uPulseAge*.95)/.11,2.)) * (1.-smoothstep(.3,1.35,uPulseAge));
          diffuseColor.rgb += vec3(sweep * .075);`)
    }
    mat.customProgramCacheKey = () => 'focz-dielectric-dew-v1'
    return mat
  }, [uniforms])
  useEffect(() => () => material.dispose(), [material])

  useEffect(() => {
    const dummy = new Object3D(); let seed = 41
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
    // Mixed bead sizes and uneven density make the aluminum feel cold, not studded.
    for (let i = 0; i < count; i++) {
      const angle = random() * Math.PI * 2, y = (random() - .5) * 2.46, band = random()
      const r = band < .66 ? .003 + random() * .005 : band < .95 ? .008 + random() * .011 : .021 + random() * .013
      dummy.position.set(Math.sin(angle) * .531, y, Math.cos(angle) * .531)
      dummy.rotation.set(0, angle, 0)
      dummy.scale.set(r, r * (1 + random() * .45), r * .48)
      dummy.updateMatrix(); beads.current!.setMatrixAt(i, dummy.matrix)
    }
    beads.current!.instanceMatrix.needsUpdate = true
    beads.current!.computeBoundingSphere()
    // A few coalesced tracks. Their highlights have a vertical gravity direction.
    for (let i = 0; i < 4; i++) {
      const a = [-.36, .48, 1.55, -2.3][i]
      dummy.position.set(Math.sin(a) * .5305, [.76, -.4, .25, -.84][i], Math.cos(a) * .5305)
      dummy.rotation.set(0, a, 0); dummy.scale.set(.0028, .045 + random() * .055, .0015)
      dummy.updateMatrix(); trails.current!.setMatrixAt(i, dummy.matrix)
    }
    trails.current!.instanceMatrix.needsUpdate = true
    trails.current!.computeBoundingSphere()
  }, [count])

  useFrame((_state, delta) => {
    const p = signal.current.progress, state = interaction.current
    const weights = worldWeights(p), sum = weights[0] + weights[1] + weights[2]
    uniforms.current.uWeights.value.set(...(sum > .001 ? weights.map(w => w / sum) as [number, number, number] : [1, 0, 0] as [number, number, number]))
    uniforms.current.uPoint.value.fromArray(state.point)
    const target = state.hovered ? 1 : 0
    uniforms.current.uHover.value = reduced ? target * .55 : uniforms.current.uHover.value + (target - uniforms.current.uHover.value) * (1 - Math.exp(-delta * 9))
    uniforms.current.uPulseAge.value = reduced ? 10 : Math.max(0, performance.now() / 1000 - state.pulseAt)
    uniforms.current.uPulsePoint.value.fromArray(state.pulsePoint)
    uniforms.current.uNarrative.value = windowed(.32, .39, .49, .57, p) * .72
    if (hero.current) {
      const gather = smooth(.28, .38, p), fall = smooth(.395, .49, p)
      const a = .2, r = .023 + gather * .022
      hero.current.position.set(Math.sin(a) * .532, .91 - fall * .44, Math.cos(a) * .532)
      hero.current.rotation.y = a
      hero.current.scale.set(r, r * (1.1 + windowed(.36, .4, .46, .51, p) * .65), r * .5)
      hero.current.updateMatrix()
      uniforms.current.uHeroMatrix.value.copy(hero.current.matrix)
      uniforms.current.uHero.value.copy(hero.current.position)
    }
  })

  return <>
    <instancedMesh ref={beads} args={[undefined, undefined, count]} frustumCulled={false}>
      <sphereGeometry args={[1, 12, 10]} /><primitive object={material} attach="material" />
    </instancedMesh>
    <instancedMesh ref={trails} args={[undefined, undefined, 4]} frustumCulled={false}>
      <sphereGeometry args={[1, 10, 8]} /><primitive object={material} attach="material" />
    </instancedMesh>
    <mesh ref={hero}><sphereGeometry args={[1, 20, 14]} /><primitive object={material} attach="material" /></mesh>
  </>
}

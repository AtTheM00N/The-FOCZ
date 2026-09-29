import { useId, useRef } from 'react'
import { Brand } from '../components/Brand'
import { useLiquidLens } from './useLiquidLens'
import './liquid-wordmark.css'

export function LiquidWordmark({ disabled, reduced, onActivate }: { disabled: boolean; reduced: boolean; onActivate: () => void }) {
  const id = `focz-lens-${useId().replace(/:/g, '')}`
  const button = useRef<HTMLButtonElement>(null), text = useRef<HTMLSpanElement>(null)
  const glass = useRef<HTMLSpanElement>(null), ripple = useRef<HTMLSpanElement>(null)
  const filter = useRef<SVGFilterElement>(null)
  const lensImage = useRef<SVGFEImageElement>(null), rippleImage = useRef<SVGFEImageElement>(null)
  const lensScale = useRef<SVGFEDisplacementMapElement>(null), rippleScale = useRef<SVGFEDisplacementMapElement>(null)
  const activate = useLiquidLens({ button, text, glass, ripple, filter, lensImage, rippleImage, lensScale, rippleScale }, { id, disabled, reduced })

  return <button ref={button} type="button" className="film-wordmark" disabled={disabled} aria-label="FOCZ. Bring into focus." onClick={event => { activate.current?.(event.detail === 0); onActivate() }}>
    <Brand ref={text} className="liquid-wordmark-text" />
    <span ref={glass} className="liquid-wordmark-glass" aria-hidden="true" />
    <span ref={ripple} className="liquid-wordmark-ripple" aria-hidden="true" />
    <svg className="liquid-wordmark-defs" aria-hidden="true" focusable="false" width="0" height="0">
      <defs>
        <filter ref={filter} id={id} filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="-32" y="-32" colorInterpolationFilters="sRGB">
          <feFlood floodColor="rgb(128,128,128)" result="neutral" />
          <feImage ref={lensImage} result="lens" preserveAspectRatio="none" />
          <feMerge result="lens-field"><feMergeNode in="neutral" /><feMergeNode in="lens" /></feMerge>
          <feGaussianBlur in="lens-field" stdDeviation=".65" result="smooth-lens" />
          <feComponentTransfer in="smooth-lens" result="lens-map">
            <feFuncR type="linear" intercept="-.0019607843" /><feFuncG type="linear" intercept="-.0019607843" />
          </feComponentTransfer>
          <feDisplacementMap ref={lensScale} in="SourceGraphic" in2="lens-map" scale="0" xChannelSelector="R" yChannelSelector="G" result="refracted" />
          <feImage ref={rippleImage} result="ripple" preserveAspectRatio="none" />
          <feMerge result="ripple-field"><feMergeNode in="neutral" /><feMergeNode in="ripple" /></feMerge>
          <feGaussianBlur in="ripple-field" stdDeviation=".65" result="smooth-ripple" />
          <feComponentTransfer in="smooth-ripple" result="ripple-map">
            <feFuncR type="linear" intercept="-.0019607843" /><feFuncG type="linear" intercept="-.0019607843" />
          </feComponentTransfer>
          <feDisplacementMap ref={rippleScale} in="refracted" in2="ripple-map" scale="0" xChannelSelector="R" yChannelSelector="G" />
          <feGaussianBlur stdDeviation=".3" />
        </filter>
      </defs>
    </svg>
  </button>
}

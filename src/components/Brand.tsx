import type { Ref } from 'react'

export function Brand({ className = '', ref }: { className?: string; ref?: Ref<HTMLSpanElement> }) {
  return <span ref={ref} className={`wordmark ${className}`}>FOCZ</span>
}

export function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={diagonal ? { transform: 'rotate(-45deg)' } : undefined}><path d="M4 12h15M13 5l7 7-7 7" stroke="currentColor" strokeWidth="1.4" /></svg>
}

import { smooth, windowed } from './timeline'

/** A quiet, opt-in score; all progression is driven by the film playhead. */
export class FilmSound {
  private ctx?: AudioContext
  private master?: GainNode
  private bass?: OscillatorNode
  private bassGain?: GainNode
  private noiseGain?: GainNode
  private filter?: BiquadFilterNode
  private noise?: AudioBufferSourceNode
  private transients = new Set<AudioBufferSourceNode>()
  private previous = 0
  private lastReflection = -10
  private lastFocus = -10
  private disposed = false
  enabled = false
  async toggle() {
    if (this.disposed) return false
    if (this.enabled) { this.enabled = false; await this.ctx?.suspend(); return false }
    try {
      if (!this.ctx) {
        const ctx = new AudioContext(); this.ctx = ctx
        this.master = ctx.createGain(); this.master.gain.value = .1; this.master.connect(ctx.destination)
        this.bass = ctx.createOscillator(); this.bass.type = 'sine'; this.bass.frequency.value = 68
        this.bassGain = ctx.createGain(); this.bassGain.gain.value = 0
        this.bass.connect(this.bassGain); this.bassGain.connect(this.master); this.bass.start()
        const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), data = buffer.getChannelData(0)
        let previous = 0
        for (let i = 0; i < data.length; i++) { previous = (previous + (Math.random() * 2 - 1) * .025) / 1.025; data[i] = previous * 3.5 }
        this.noise = ctx.createBufferSource(); this.noise.buffer = buffer; this.noise.loop = true
        this.filter = ctx.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.frequency.value = 420
        this.noiseGain = ctx.createGain(); this.noiseGain.gain.value = 0
        this.noise.connect(this.filter); this.filter.connect(this.noiseGain); this.noiseGain.connect(this.master); this.noise.start()
      }
      await this.ctx.resume()
      if (this.disposed) return false
      this.enabled = true; return true
    } catch { return false }
  }
  /** A small tactile response. This never creates or resumes an audio context. */
  focus() {
    if (!this.ctx || !this.enabled || this.ctx.state !== 'running' || this.disposed) return
    const t = this.ctx.currentTime
    if (t - this.lastFocus < .12) return
    this.lastFocus = t
    const buffer = this.ctx.createBuffer(1, Math.ceil(this.ctx.sampleRate * .065), this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    this.air(buffer, 1650, .12, .002, .065)
  }
  private air(buffer: AudioBuffer, frequency: number, peak: number, attack: number, duration: number) {
    const ctx = this.ctx, master = this.master
    if (!ctx || !master || this.disposed) return
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain(), t = ctx.currentTime
    source.buffer = buffer
    filter.type = 'bandpass'; filter.frequency.value = frequency; filter.Q.value = .6
    gain.gain.setValueAtTime(.0001, t)
    gain.gain.exponentialRampToValueAtTime(peak, t + attack)
    gain.gain.exponentialRampToValueAtTime(.0001, t + duration)
    source.connect(filter); filter.connect(gain); gain.connect(master)
    this.transients.add(source)
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); this.transients.delete(source) }
    source.start(); source.stop(t + duration + .015)
  }
  update(p: number, velocity: number, visible: boolean) {
    if (!this.ctx || !this.enabled || this.ctx.state !== 'running' || this.disposed) { this.previous = p; return }
    const t = this.ctx.currentTime, breath = windowed(.28, .43, .49, .6, p), quiet = 1 - smooth(.855, .96, p)
    this.bassGain!.gain.setTargetAtTime(visible ? (.022 + breath * .028) * quiet : 0, t, .28)
    this.noiseGain!.gain.setTargetAtTime(visible ? Math.min(.075, .018 + Math.abs(velocity) * .035 + breath * .025) * quiet : 0, t, .22)
    this.filter!.frequency.setTargetAtTime(420 + breath * 220 + smooth(.62, .85, p) * 110, t, .25)
    this.bass!.frequency.setTargetAtTime(68 + breath * 2, t, .25)
    if (visible && (p - .487) * (this.previous - .487) < 0 && Math.abs(p - this.previous) < .06 && t - this.lastReflection > 1.1) {
      this.lastReflection = t
      if (this.noise?.buffer) this.air(this.noise.buffer, 950, .09, .18, .7)
    }
    this.previous = p
  }
  dispose() {
    if (this.disposed) return
    this.disposed = true; this.enabled = false
    this.bass?.stop(); this.noise?.stop()
    this.transients.forEach(source => source.stop())
    this.transients.clear()
    void this.ctx?.close().catch(() => {})
  }
}

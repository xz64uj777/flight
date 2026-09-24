/** Lightweight WebAudio rotor + wind bed (no assets). */

export type RotorAudio = {
  start: () => void
  stop: () => void
  update: (rotorRpm: number, collective: number, speedMs: number) => void
}

export function createRotorAudio(): RotorAudio {
  let ctx: AudioContext | null = null
  let master: GainNode | null = null
  let rotorGain: GainNode | null = null
  let windGain: GainNode | null = null
  let rotorOsc: OscillatorNode | null = null
  let rotorLfo: OscillatorNode | null = null
  let rotorLfoGain: GainNode | null = null
  let noiseSrc: AudioBufferSourceNode | null = null
  let started = false

  function ensure() {
    if (ctx) return
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.22
    master.connect(ctx.destination)

    rotorGain = ctx.createGain()
    rotorGain.gain.value = 0
    rotorGain.connect(master)

    rotorOsc = ctx.createOscillator()
    rotorOsc.type = 'sawtooth'
    rotorOsc.frequency.value = 48
    const rotorFilter = ctx.createBiquadFilter()
    rotorFilter.type = 'lowpass'
    rotorFilter.frequency.value = 420
    rotorFilter.Q.value = 0.7
    rotorLfo = ctx.createOscillator()
    rotorLfo.type = 'sine'
    rotorLfo.frequency.value = 12
    rotorLfoGain = ctx.createGain()
    rotorLfoGain.gain.value = 6
    rotorLfo.connect(rotorLfoGain)
    rotorLfoGain.connect(rotorOsc.frequency)
    rotorOsc.connect(rotorFilter)
    rotorFilter.connect(rotorGain)
    rotorOsc.start()
    rotorLfo.start()

    windGain = ctx.createGain()
    windGain.gain.value = 0
    windGain.connect(master)
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    noiseSrc = ctx.createBufferSource()
    noiseSrc.buffer = buffer
    noiseSrc.loop = true
    const windFilter = ctx.createBiquadFilter()
    windFilter.type = 'bandpass'
    windFilter.frequency.value = 800
    windFilter.Q.value = 0.6
    noiseSrc.connect(windFilter)
    windFilter.connect(windGain)
    noiseSrc.start()
  }

  return {
    start() {
      ensure()
      void ctx!.resume()
      started = true
    },
    stop() {
      started = false
      if (rotorGain && ctx) rotorGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05)
      if (windGain && ctx) windGain.gain.setTargetAtTime(0, ctx.currentTime, 0.05)
    },
    update(rotorRpm, collective, speedMs) {
      if (!started || !ctx || !rotorGain || !windGain || !rotorOsc || !rotorLfo) return
      if (ctx.state === 'suspended') void ctx.resume()
      const t = ctx.currentTime
      const rpm = Math.max(0, Math.min(1, rotorRpm))
      const coll = Math.max(0, Math.min(1, collective))
      // Base wash from rpm; swell with collective
      const level = rpm * (0.35 + coll * 0.65) * 0.55
      rotorGain.gain.setTargetAtTime(level, t, 0.08)
      rotorOsc.frequency.setTargetAtTime(36 + rpm * 55 + coll * 18, t, 0.1)
      rotorLfo.frequency.setTargetAtTime(8 + rpm * 18, t, 0.1)
      // Light wind with airspeed
      const wind = Math.min(0.28, (speedMs / 40) * 0.28)
      windGain.gain.setTargetAtTime(wind, t, 0.15)
    },
  }
}

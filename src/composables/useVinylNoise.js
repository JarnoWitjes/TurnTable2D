import { watch } from 'vue'

export function useVinylNoise(audioContext, intensity) {
  let noiseNode = null
  let hissFilter = null
  let hissShimmer = null
  let hissGain = null
  let running = false
  let crackleTimeoutId = null
  let popTimeoutId = null
  let blobUrl = null
  let workletRegistered = false

  // ── Intensity helper ──────────────────────────────────────────────────────
  function hissGainValue(v) {
    return (v / 100) * 0.018
  }

  // ── AudioWorklet blob URL (created once) ──────────────────────────────────
  function getWorkletBlobUrl() {
    if (!blobUrl) {
      const src = `
        class WhiteNoiseProcessor extends AudioWorkletProcessor {
          process(inputs, outputs) {
            const out = outputs[0]
            for (const channel of out) {
              for (let i = 0; i < channel.length; i++) {
                channel[i] = Math.random() * 2 - 1
              }
            }
            return true
          }
        }
        registerProcessor('white-noise-processor', WhiteNoiseProcessor)
      `
      blobUrl = URL.createObjectURL(new Blob([src], { type: 'application/javascript' }))
    }
    return blobUrl
  }

  // ── Build noise source node (worklet preferred, scriptprocessor fallback) ─
  async function buildNoiseNode(ctx) {
    if (ctx.audioWorklet) {
      try {
        if (!workletRegistered) {
          await ctx.audioWorklet.addModule(getWorkletBlobUrl())
          workletRegistered = true
        }
        return new AudioWorkletNode(ctx, 'white-noise-processor')
      } catch (_) {
        // fall through to ScriptProcessor
      }
    }
    const sp = ctx.createScriptProcessor(4096, 0, 1)
    sp.onaudioprocess = (e) => {
      const output = e.outputBuffer.getChannelData(0)
      for (let i = 0; i < output.length; i++) output[i] = Math.random() * 2 - 1
    }
    return sp
  }

  // ── Needle-drop thump ─────────────────────────────────────────────────────
  function fireNeedleDrop(ctx) {
    const durationSec = 0.12
    const frameCount = Math.floor(ctx.sampleRate * durationSec)
    const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < frameCount; i++) data[i] = Math.random() * 2 - 1

    const source = ctx.createBufferSource()
    source.buffer = buffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 150

    const gainNode = ctx.createGain()
    const now = ctx.currentTime
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(0.5, now + 0.005)
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + durationSec)

    source.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(ctx.destination)
    source.start(now)
    source.onended = () => {
      try { gainNode.disconnect(); filter.disconnect(); source.disconnect() } catch (_) {}
    }
  }

  // ── Crackle: soft burst of highpass noise blending into surface texture ─────
  function fireCrackle() {
    const ctx = audioContext.value
    if (!ctx) return

    const scale = Math.max(0.01, intensity.value / 100)
    const now = ctx.currentTime
    const sampleRate = ctx.sampleRate
    const durationSec = (8 + Math.random() * 14) / 1000   // 8–22 ms — long enough to not click
    const frameCount = Math.max(1, Math.floor(sampleRate * durationSec))

    const buffer = ctx.createBuffer(1, frameCount, sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < frameCount; i++) data[i] = Math.random() * 2 - 1

    // Short fade-out at the buffer tail to prevent end-of-buffer click
    const fadeFrames = Math.floor(sampleRate * 0.003)
    for (let i = frameCount - fadeFrames; i < frameCount; i++) {
      data[i] *= (frameCount - i) / fadeFrames
    }

    const source = ctx.createBufferSource()
    source.buffer = buffer

    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 5000

    const gainNode = ctx.createGain()
    // Keep gain low so crackles blend into hiss texture, not stand out as clicks
    const peakGain = (0.06 + Math.random() * 0.06) * scale
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(peakGain, now + 0.003)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + durationSec)

    source.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(ctx.destination)
    source.start(now)
    source.onended = () => {
      try { gainNode.disconnect(); filter.disconnect(); source.disconnect() } catch (_) {}
    }
  }

  // ── Pop: damped sine at lower-mid frequency ───────────────────────────────
  // 180–320 Hz sits in the range where vinyl pops are perceived — lower-mid,
  // not sub-bass (which bashes) and not mid (which sounds like a click).
  // Buffer fades out the last 4 ms to prevent the end-of-buffer snap click.
  function firePop() {
    const ctx = audioContext.value
    if (!ctx) return

    const scale = Math.max(0.01, intensity.value / 100)
    const now = ctx.currentTime
    const sampleRate = ctx.sampleRate

    const isBig = Math.random() < 0.15
    const freq        = isBig ? 130 + Math.random() * 70  : 180 + Math.random() * 140  // 130–200 / 180–320 Hz
    const decayRate   = isBig ? 28 : 40
    const durationSec = isBig ? 0.07 : 0.05
    const frameCount  = Math.floor(sampleRate * durationSec)

    const buffer = ctx.createBuffer(1, frameCount, sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < frameCount; i++) {
      const t = i / sampleRate
      data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * decayRate)
    }

    // Fade out last 4 ms to silence so the buffer end doesn't snap-click
    const fadeFrames = Math.floor(sampleRate * 0.004)
    for (let i = frameCount - fadeFrames; i < frameCount; i++) {
      data[i] *= (frameCount - i) / fadeFrames
    }

    const source = ctx.createBufferSource()
    source.buffer = buffer

    const gainNode = ctx.createGain()
    gainNode.gain.value = isBig
      ? (0.16 + Math.random() * 0.10) * scale
      : (0.09 + Math.random() * 0.08) * scale

    source.connect(gainNode)
    gainNode.connect(ctx.destination)
    source.start(now)
    source.onended = () => {
      try { gainNode.disconnect(); source.disconnect() } catch (_) {}
    }
  }

  // ── Separate schedulers for crackles and pops ────────────────────────────
  // Crackles: frequent surface texture
  function scheduleCrackle() {
    if (!running) return
    const eps = 0.5 + (intensity.value / 100) * 4.0
    const delay = -Math.log(1 - Math.random()) / eps
    crackleTimeoutId = setTimeout(() => {
      if (!running) return
      fireCrackle()
      scheduleCrackle()
    }, delay * 1000)
  }

  // Pops: rare, one every several seconds even at high intensity
  function schedulePop() {
    if (!running) return
    const eps = 0.04 + (intensity.value / 100) * 0.25  // 0.04–0.29 /sec → 3–25 sec intervals
    const delay = -Math.log(1 - Math.random()) / eps
    popTimeoutId = setTimeout(() => {
      if (!running) return
      firePop()
      schedulePop()
    }, delay * 1000)
  }

  function clearSchedulers() {
    if (crackleTimeoutId !== null) { clearTimeout(crackleTimeoutId); crackleTimeoutId = null }
    if (popTimeoutId     !== null) { clearTimeout(popTimeoutId);     popTimeoutId = null }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  async function start() {
    const ctx = audioContext.value
    if (!ctx) return

    _teardown()
    fireNeedleDrop(ctx)

    noiseNode = await buildNoiseNode(ctx)
    hissFilter = ctx.createBiquadFilter()
    hissFilter.type = 'highpass'
    hissFilter.frequency.value = 4000
    hissFilter.Q.value = 0.8

    hissShimmer = ctx.createBiquadFilter()
    hissShimmer.type = 'peaking'
    hissShimmer.frequency.value = 8000
    hissShimmer.Q.value = 2
    hissShimmer.gain.value = 3

    hissGain = ctx.createGain()
    hissGain.gain.value = hissGainValue(intensity.value)

    noiseNode.connect(hissFilter)
    hissFilter.connect(hissShimmer)
    hissShimmer.connect(hissGain)
    hissGain.connect(ctx.destination)

    running = true
    scheduleCrackle()
    schedulePop()
  }

  function pause() {
    if (!running) return
    running = false
    clearSchedulers()
    if (hissGain) {
      try { hissGain.disconnect() } catch (_) {}
    }
  }

  function resume() {
    const ctx = audioContext.value
    if (!ctx || running) return
    if (hissGain) {
      try { hissGain.connect(ctx.destination) } catch (_) {}
    }
    running = true
    scheduleCrackle()
    schedulePop()
  }

  function _teardown() {
    running = false
    clearSchedulers()
    if (noiseNode)   { try { noiseNode.disconnect()   } catch (_) {} ; noiseNode = null }
    if (hissFilter)  { try { hissFilter.disconnect()  } catch (_) {} ; hissFilter = null }
    if (hissShimmer) { try { hissShimmer.disconnect() } catch (_) {} ; hissShimmer = null }
    if (hissGain)    { try { hissGain.disconnect()    } catch (_) {} ; hissGain = null }
  }

  function stop() {
    _teardown()
  }

  // ── Intensity reactivity ──────────────────────────────────────────────────
  watch(intensity, (v) => {
    if (hissGain && audioContext.value) {
      hissGain.gain.setTargetAtTime(hissGainValue(v), audioContext.value.currentTime, 0.05)
    }
  })

  return { start, stop, pause, resume }
}

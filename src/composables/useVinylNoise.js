import { watch } from 'vue'

export function useVinylNoise(audioContext, intensity) {
  let noiseNode = null
  let hissFilter = null
  let hissShimmer = null
  let hissGain = null
  let running = false
  let timeoutId = null
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
    // ScriptProcessor fallback
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

  // ── Pop / crackle event ───────────────────────────────────────────────────
  function fireNoiseEvent() {
    const ctx = audioContext.value
    if (!ctx) return

    const isCrackle = Math.random() < 0.7
    const isBigPop = !isCrackle && Math.random() < 0.05
    const scale = Math.max(0.01, intensity.value / 100)

    const sampleRate = ctx.sampleRate
    const durationSec = isCrackle
      ? (4 + Math.random() * 6) / 1000
      : (15 + Math.random() * 20) / 1000
    const frameCount = Math.max(1, Math.floor(sampleRate * durationSec))

    const buffer = ctx.createBuffer(1, frameCount, sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < frameCount; i++) data[i] = Math.random() * 2 - 1

    const source = ctx.createBufferSource()
    source.buffer = buffer

    const filter = ctx.createBiquadFilter()
    if (isCrackle) {
      filter.type = 'highpass'
      filter.frequency.value = 6000
    } else {
      filter.type = 'bandpass'
      filter.frequency.value = 800 + Math.random() * 1200
      filter.Q.value = 1.5
    }

    const gainNode = ctx.createGain()
    let peakGain
    if (isCrackle) {
      peakGain = (0.25 + Math.random() * 0.25) * scale
    } else if (isBigPop) {
      peakGain = (0.6 + Math.random() * 0.3) * scale
    } else {
      peakGain = (0.35 + Math.random() * 0.30) * scale
    }

    const now = ctx.currentTime
    const attackTime = isCrackle ? 0.001 : 0.003
    gainNode.gain.setValueAtTime(0, now)
    gainNode.gain.linearRampToValueAtTime(peakGain, now + attackTime)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + durationSec)

    source.connect(filter)
    filter.connect(gainNode)
    gainNode.connect(ctx.destination)
    source.start(now)
    source.onended = () => {
      try { gainNode.disconnect(); filter.disconnect(); source.disconnect() } catch (_) {}
    }
  }

  // ── Crackle scheduler ─────────────────────────────────────────────────────
  function scheduleEvent() {
    if (!running) return
    const eps = 0.5 + (intensity.value / 100) * 4.5
    const delay = -Math.log(1 - Math.random()) / eps
    timeoutId = setTimeout(() => {
      if (!running) return
      fireNoiseEvent()
      scheduleEvent()
    }, delay * 1000)
  }

  function clearScheduler() {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  async function start() {
    const ctx = audioContext.value
    if (!ctx) return

    // Tear down any existing nodes before rebuilding
    _teardown()

    // Needle drop thump — fires immediately when play is pressed
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
    scheduleEvent()
  }

  function pause() {
    if (!running) return
    running = false
    clearScheduler()
    if (hissGain) {
      try { hissGain.disconnect() } catch (_) {}
    }
  }

  function resume() {
    const ctx = audioContext.value
    if (!ctx || running) return
    if (hissGain && hissShimmer) {
      try { hissGain.connect(ctx.destination) } catch (_) {}
    }
    running = true
    scheduleEvent()
  }

  function _teardown() {
    running = false
    clearScheduler()
    if (noiseNode)    { try { noiseNode.disconnect()    } catch (_) {} ; noiseNode = null }
    if (hissFilter)   { try { hissFilter.disconnect()   } catch (_) {} ; hissFilter = null }
    if (hissShimmer)  { try { hissShimmer.disconnect()  } catch (_) {} ; hissShimmer = null }
    if (hissGain)     { try { hissGain.disconnect()     } catch (_) {} ; hissGain = null }
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

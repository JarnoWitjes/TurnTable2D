import { ref, computed } from 'vue'

export function useAudioEngine() {
  const audioContextRef = ref(null)
  let sources = []          // currently scheduled AudioBufferSourceNodes
  let startedAt = 0         // audioCtx.currentTime when side started
  let pausedAt = 0          // elapsed seconds when paused
  let rafId = null
  let currentTracks = []
  let trackStartOffsets = [] // cumulative start time of each track within the side

  const elapsed = ref(0)
  const isPlaying = ref(false)
  const totalSideTime = computed(() =>
    currentTracks.reduce((sum, t) => sum + t.duration, 0)
  )
  const currentTrackIndex = ref(0)

  function ensureContext() {
    if (!audioContextRef.value) {
      audioContextRef.value = new AudioContext()
    }
    return audioContextRef.value
  }

  function buildOffsets(tracks) {
    const offsets = []
    let t = 0
    for (const track of tracks) {
      offsets.push(t)
      t += track.duration
    }
    return offsets
  }

  function stopAllSources() {
    for (const src of sources) {
      try { src.onended = null; src.stop() } catch (_) {}
    }
    sources = []
  }

  function scheduleFrom(trackIdx, contextStartTime, trackOffset) {
    // Play track at trackIdx starting 'trackOffset' seconds into it,
    // with the source node starting at contextStartTime in AudioContext time.
    if (trackIdx >= currentTracks.length) {
      // Side finished — update elapsed to total, stop loop
      elapsed.value = totalSideTime.value
      isPlaying.value = false
      stopRaf()
      return
    }

    const track = currentTracks[trackIdx]
    const ctx = audioContextRef.value
    const src = ctx.createBufferSource()
    src.buffer = track.buffer
    src.connect(ctx.destination)

    const remaining = track.duration - trackOffset
    src.start(contextStartTime, trackOffset)
    sources.push(src)

    src.onended = () => {
      // Remove this source
      sources = sources.filter(s => s !== src)
      // Only schedule next if we're still playing
      if (isPlaying.value) {
        currentTrackIndex.value = trackIdx + 1
        scheduleFrom(trackIdx + 1, contextStartTime + remaining, 0)
      }
    }
  }

  function startRaf() {
    stopRaf()
    function tick() {
      if (audioContextRef.value && isPlaying.value) {
        elapsed.value = audioContextRef.value.currentTime - startedAt
        // Update currentTrackIndex based on elapsed
        for (let i = trackStartOffsets.length - 1; i >= 0; i--) {
          if (elapsed.value >= trackStartOffsets[i]) {
            currentTrackIndex.value = i
            break
          }
        }
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
  }

  function stopRaf() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  function play(tracks) {
    const ctx = ensureContext()
    currentTracks = tracks
    trackStartOffsets = buildOffsets(tracks)

    if (ctx.state === 'suspended') {
      // Resuming from pause
      ctx.resume().then(() => {
        startedAt = ctx.currentTime - pausedAt
        isPlaying.value = true
        startRaf()
        // Re-schedule remaining audio from current position
        const resumeElapsed = pausedAt
        let trackIdx = 0
        let offsetInTrack = resumeElapsed
        for (let i = 0; i < trackStartOffsets.length; i++) {
          if (i + 1 < trackStartOffsets.length && resumeElapsed >= trackStartOffsets[i + 1]) continue
          trackIdx = i
          offsetInTrack = resumeElapsed - trackStartOffsets[i]
          break
        }
        stopAllSources()
        currentTrackIndex.value = trackIdx
        scheduleFrom(trackIdx, ctx.currentTime, offsetInTrack)
      })
    } else {
      // Fresh play — lead-in delay before audio starts
      const LEAD_IN_SECONDS = 1.5
      stopAllSources()
      pausedAt = 0
      startedAt = ctx.currentTime + LEAD_IN_SECONDS  // elapsed = −1.5 during lead-in
      elapsed.value = ctx.currentTime - startedAt    // initialise to −1.5
      currentTrackIndex.value = 0
      isPlaying.value = true
      startRaf()
      scheduleFrom(0, ctx.currentTime + LEAD_IN_SECONDS, 0)
    }
  }

  function pause() {
    if (!audioContextRef.value || !isPlaying.value) return
    pausedAt = elapsed.value
    stopAllSources()
    audioContextRef.value.suspend()
    isPlaying.value = false
    stopRaf()
  }

  function stop() {
    if (!audioContextRef.value) return
    stopAllSources()
    if (audioContextRef.value.state === 'suspended') audioContextRef.value.resume()
    pausedAt = 0
    elapsed.value = 0
    currentTrackIndex.value = 0
    isPlaying.value = false
    stopRaf()
    // Reset startedAt so next play starts fresh
    startedAt = 0
  }

  function getCurrentTrackName() {
    if (!currentTracks.length) return ''
    const idx = Math.min(currentTrackIndex.value, currentTracks.length - 1)
    return currentTracks[idx]?.name ?? ''
  }

  return {
    play,
    pause,
    stop,
    elapsed,
    isPlaying,
    totalSideTime,
    currentTrackIndex,
    getCurrentTrackName,
    audioContext: audioContextRef,
  }
}

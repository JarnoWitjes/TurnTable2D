<template>
  <div id="app-root">
    <!-- Header -->
    <header class="app-header">
      <h1 class="app-title">TurnTable2D</h1>
    </header>

    <!-- Turntable (always visible) -->
    <Turntable
      :loaded="mode !== null"
      :side="currentSide"
      :rpm="rpm"
      :playing="isPlaying"
      :tonearm-angle="tonearmAngle"
    />

    <!-- Load Panel (shown when no record) -->
    <LoadPanel v-if="mode === null" @loaded="onLoaded" />

    <!-- Transport controls + info (shown when record is loaded) -->
    <template v-else>
      <Controls
        :is-playing="isPlaying"
        :has-record="true"
        @play="onPlay"
        @pause="onPause"
        @stop="onStop"
        @eject="onEject"
      />

      <div class="info-bar">
        <span class="track-name">{{ currentTrackName }}</span>
        <span class="time-display">
          {{ formatTime(displayElapsed) }} / {{ formatTime(totalTime) }}
        </span>
        <span v-if="mode === 'album'" class="side-badge">Side {{ currentSide }}</span>
      </div>

      <div class="wear-row">
        <CrackleSlider v-model="crackleIntensity" />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import Turntable  from './components/Turntable.vue'
import LoadPanel  from './components/LoadPanel.vue'
import Controls   from './components/Controls.vue'
import CrackleSlider from './components/CrackleSlider.vue'
import { useAudioEngine }  from './composables/useAudioEngine.js'
import { useVinylNoise } from './composables/useVinylNoise.js'
import { sideTotalDuration } from './composables/useAlbumSides.js'
import { formatTime } from './utils/formatTime.js'

// ── Global state ─────────────────────────────────────────────────────────────
const mode          = ref(null)         // null | 'single' | 'album'
const rpm           = ref(33)
const isPlaying     = ref(false)
const currentSide   = ref('A')
const sides         = reactive({ A: [], B: [] })

// ── Audio engine ──────────────────────────────────────────────────────────────
const engine = useAudioEngine()

// ── Crackle / vinyl noise ─────────────────────────────────────────────────────
const crackleIntensity = ref(30)
const noise = useVinylNoise(engine.audioContext, crackleIntensity)

// ── Tonearm angles (RPM-dependent) ───────────────────────────────────────────
// Geometry: platter centre (250,220), pivot (510,340), arm 265px
// 33 RPM (vinyl r=172): outer groove ~164px → −122°, inner groove ~53px → −145°
// 45 RPM (vinyl r=100): outer groove  ~92px → −137°, inner groove ~40px → −148°
// Rest (−85°): stylus parked clear of record regardless of RPM
const ANGLE_REST  = -85
const ANGLE_START = computed(() => rpm.value === 45 ? -137 : -122)
const ANGLE_END   = computed(() => rpm.value === 45 ? -148 : -145)

// ── Derived values ────────────────────────────────────────────────────────────
const currentSideTracks = computed(() => sides[currentSide.value] ?? [])

const totalTime = computed(() => sideTotalDuration(currentSideTracks.value))

// elapsed from engine; clamp to [0, total] — negative during lead-in shows as 00:00
const displayElapsed = computed(() =>
  Math.max(0, Math.min(engine.elapsed.value, totalTime.value))
)

const tonearmAngle = computed(() => {
  if (!isPlaying.value && engine.elapsed.value <= 0) return ANGLE_REST
  const progress = totalTime.value > 0
    ? Math.min(displayElapsed.value / totalTime.value, 1)
    : 0
  return ANGLE_START.value + progress * (ANGLE_END.value - ANGLE_START.value)
})

const currentTrackName = computed(() => engine.getCurrentTrackName())

// Revolution duration CSS value (passed to Record via Turntable)
// (Turntable passes rpm → Record computes this itself)

// ── Event handlers ────────────────────────────────────────────────────────────
function onLoaded({ mode: m, rpm: r, sides: s }) {
  mode.value = m
  rpm.value  = r
  sides.A = s.A
  sides.B = s.B
  currentSide.value = 'A'
  // Don't auto-play; wait for user to press Play
}

function onPlay() {
  const resuming = engine.elapsed.value > 0
  isPlaying.value = true
  engine.play(currentSideTracks.value)
  if (resuming) {
    noise.resume()
  } else {
    noise.start()
  }
}

function onPause() {
  isPlaying.value = false
  engine.pause()
  noise.pause()
}

function onStop() {
  isPlaying.value = false
  engine.stop()
  noise.stop()
}

function onEject() {
  isPlaying.value = false
  engine.stop()
  noise.stop()
  mode.value = null
  sides.A = []
  sides.B = []
  currentSide.value = 'A'
}

// When the engine signals side end (elapsed ≥ total), handle side transition
watch(
  () => engine.elapsed.value,
  (t) => {
    if (isPlaying.value && totalTime.value > 0 && t >= totalTime.value) {
      handleSideEnd()
    }
  }
)

function handleSideEnd() {
  isPlaying.value = false
  engine.stop()
  noise.stop()
  if (mode.value === 'album' && currentSide.value === 'A' && sides.B.length > 0) {
    // Prompt user to flip — for now just auto-flip after a moment
    setTimeout(() => {
      currentSide.value = 'B'
    }, 800)
  }
}
</script>

<style scoped>
.app-header {
  text-align: center;
  padding: 1.5rem 0 1rem;
}

.app-title {
  font-family: 'Libre Baskerville', serif;
  font-size: 2rem;
  font-weight: 700;
  font-style: italic;
  color: var(--color-text);
  letter-spacing: 0.04em;
}

.info-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 0.6rem 1rem;
  font-family: 'Libre Baskerville', serif;
  font-size: 0.9rem;
  color: var(--color-text);
  opacity: 0.85;
}

.track-name {
  font-style: italic;
  max-width: 260px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.time-display {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.06em;
}

.side-badge {
  background: var(--color-plinth);
  color: var(--color-plinth-trim);
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
}

.wear-row {
  display: flex;
  justify-content: center;
  padding: 0.5rem 0 0.75rem;
}
</style>

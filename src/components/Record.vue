<template>
  <g
    v-if="loaded"
    :transform="`translate(${cx}, ${cy})`"
  >
    <!--
      Inner group handles the spin animation.
      transform-origin at (0,0) relative to this group = platter centre.
    -->
    <g
      class="record-disc"
      :class="{ spinning: playing }"
      :style="{ '--revolution-duration': revolutionDuration }"
    >
      <!-- Vinyl disc -->
      <circle :r="VINYL_R" fill="var(--color-vinyl)" />

      <!-- Groove rings: evenly spaced between label edge and outer vinyl edge -->
      <circle
        v-for="i in GROOVE_COUNT"
        :key="i"
        :r="grooveRadius(i)"
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        stroke-width="1"
      />

      <!-- Centre label -->
      <circle :r="LABEL_R" fill="var(--color-label)" />
      <text
        text-anchor="middle"
        :y="-9"
        font-family="'Libre Baskerville', serif"
        font-size="12"
        font-weight="700"
        fill="var(--color-text, #3b2a1a)"
      >SIDE {{ side }}</text>
      <text
        text-anchor="middle"
        :y="9"
        font-family="'Libre Baskerville', serif"
        font-size="9"
        fill="var(--color-text, #3b2a1a)"
        opacity="0.7"
      >{{ rpm }} RPM</text>

      <!-- Spindle hole overlay -->
      <circle r="5" fill="var(--color-platter, #2a2a2a)" />
    </g>
  </g>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  loaded:  { type: Boolean, default: false },
  side:    { type: String,  default: 'A' },
  rpm:     { type: Number,  default: 33 },
  playing: { type: Boolean, default: false },
  cx:      { type: Number,  default: 0 },
  cy:      { type: Number,  default: 0 },
})

// 33 RPM = 12" LP (r=172), 45 RPM = 7" single (r=100 ≈ real-world 58% scale)
const VINYL_R = computed(() => props.rpm === 45 ? 100 : 172)
const LABEL_R = computed(() => props.rpm === 45 ? 30  : 43)
const GROOVE_COUNT = 22
const GROOVE_OUTER = computed(() => VINYL_R.value - 8)
const GROOVE_INNER = computed(() => LABEL_R.value + 10)

function grooveRadius(i) {
  const t = i / (GROOVE_COUNT + 1)
  return GROOVE_INNER.value + t * (GROOVE_OUTER.value - GROOVE_INNER.value)
}

const revolutionDuration = computed(() =>
  props.rpm === 33 ? '1.818s' : '1.333s'
)
</script>

<style scoped>
.record-disc {
  transform-box: fill-box;
  transform-origin: center;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.record-disc.spinning {
  animation: spin var(--revolution-duration, 1.818s) linear infinite;
  animation-play-state: running;
}

.record-disc:not(.spinning) {
  animation: spin var(--revolution-duration, 1.818s) linear infinite;
  animation-play-state: paused;
}
</style>

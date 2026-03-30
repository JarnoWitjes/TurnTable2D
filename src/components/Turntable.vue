<template>
  <div class="turntable-wrapper">
    <svg
      class="turntable-svg"
      viewBox="0 0 700 440"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <!-- Subtle wood-grain pattern -->
        <pattern id="woodGrain" patternUnits="userSpaceOnUse" width="5" height="700" patternTransform="rotate(87)">
          <line x1="0" y1="0" x2="0" y2="700" stroke="#f5eed8" stroke-width="0.5" />
        </pattern>
      </defs>

      <!-- Plinth body -->
      <rect x="10" y="10" width="680" height="420" rx="20" ry="20"
        fill="var(--color-plinth)" />
      <rect x="10" y="10" width="680" height="420" rx="20" ry="20"
        fill="url(#woodGrain)" opacity="0.15" />
      <!-- Plinth trim -->
      <rect x="10" y="10" width="680" height="420" rx="20" ry="20"
        fill="none" stroke="var(--color-plinth-trim)" stroke-width="2.5" opacity="0.35" />

      <!-- Platter, felt mat, spindle -->
      <Platter :cx="PLATTER_CX" :cy="PLATTER_CY" />

      <!-- Vinyl record (only when loaded) -->
      <Record
        :loaded="loaded"
        :side="side"
        :rpm="rpm"
        :playing="playing"
        :cx="PLATTER_CX"
        :cy="PLATTER_CY"
      />

      <!-- Tonearm -->
      <Tonearm
        :angle="tonearmAngle"
        :pivot-x="PIVOT_X"
        :pivot-y="PIVOT_Y"
        :playing="playing"
      />

      <!-- Branding -->
      <text
        x="38" y="418"
        font-family="'Libre Baskerville', serif"
        font-size="12"
        font-style="italic"
        fill="var(--color-plinth-trim)"
        opacity="0.55"
      >TurnTable2D</text>
    </svg>
  </div>
</template>

<script setup>
import Platter  from './Platter.vue'
import Record   from './Record.vue'
import Tonearm  from './Tonearm.vue'

defineProps({
  loaded:       { type: Boolean, default: false },
  side:         { type: String,  default: 'A' },
  rpm:          { type: Number,  default: 33 },
  playing:      { type: Boolean, default: false },
  tonearmAngle: { type: Number,  default: -85 },
})

/*
 * Layout — all in SVG user units (700 × 440 viewBox).
 *
 * Platter centre: (250, 220)
 * Platter radius: 185  (from Platter.vue)
 * Vinyl radius:   172  (from Record.vue)
 * Outer groove:   ~164, inner groove: ~53
 *
 * Tonearm pivot:  (510, 340)
 * ARM_LENGTH:     265  (from Tonearm.vue)
 *
 * Geometry verified (law of cosines):
 *   At tonearmAngle=-122° → stylus ≈ 162px from platter centre (outer groove) ✓
 *   At tonearmAngle=-145° → stylus ≈ 52px from platter centre  (inner groove) ✓
 *   At tonearmAngle=-85°  → stylus far upper-right, clear of record            ✓
 */
const PLATTER_CX = 250
const PLATTER_CY = 220
const PIVOT_X    = 510
const PIVOT_Y    = 340
</script>

<style scoped>
.turntable-wrapper {
  width: 100%;
  max-width: 750px;
  margin: 0 auto;
}

.turntable-svg {
  width: 100%;
  height: auto;
  display: block;
  filter: drop-shadow(0 6px 20px rgba(0,0,0,0.4));
  border-radius: 20px;
}
</style>

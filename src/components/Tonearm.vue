<template>
  <!--
    The arm body extends in the +X direction from the pivot (at 0,0 local space).
    CSS rotate(angle) spins the whole assembly around the pivot.
    The pivot is positioned in the SVG via translate(pivotX, pivotY).
  -->
  <g :transform="`translate(${pivotX}, ${pivotY}) rotate(${angle})`" class="tonearm-group">
    <!--
      Inner group for the subtle play wobble.
      Wobble rotates around the pivot (≈ 9% from left, 35% from top of fill-box).
      Kept separate from tonearm-group so it doesn't fight the angle transition.
    -->
    <g :class="['tonearm-wobble', { wobbling: playing }]">

      <!-- Arm body: tapered polygon, wide at pivot, narrow toward headshell -->
      <polygon
        :points="`0,${BASE_HALF} ${ARM_LENGTH},${TIP_HALF} ${ARM_LENGTH},${-TIP_HALF} 0,${-BASE_HALF}`"
        fill="var(--color-arm, #c8b89a)"
      />

      <!-- Headshell -->
      <rect
        :x="ARM_LENGTH - 2"
        :y="-6"
        width="16"
        height="12"
        rx="2"
        fill="var(--color-arm, #c8b89a)"
        stroke="var(--color-brass, #b8860b)"
        stroke-width="0.8"
      />

      <!-- Stylus: vertical drop from headshell tip -->
      <line
        :x1="ARM_LENGTH + 8" :y1="6"
        :x2="ARM_LENGTH + 8" :y2="20"
        stroke="#555"
        stroke-width="1.5"
        stroke-linecap="round"
      />

      <!-- Counterweight at the rear -->
      <rect
        :x="-30" :y="-6"
        width="18" height="12"
        rx="4"
        fill="#777"
      />

      <!-- Pivot cap (rendered on top) -->
      <circle r="11" fill="var(--color-brass, #b8860b)" />
      <circle r="4"  fill="var(--color-plinth-trim, #f5eed8)" />
    </g>
  </g>
</template>

<script setup>
defineProps({
  angle:  { type: Number,  default: -85 },
  pivotX: { type: Number,  default: 510 },
  pivotY: { type: Number,  default: 340 },
  playing: { type: Boolean, default: false },
})

const ARM_LENGTH = 265  // px from pivot origin to headshell start
const BASE_HALF  = 7    // half-width at the pivot end
const TIP_HALF   = 3    // half-width at the headshell end
</script>

<style scoped>
.tonearm-group {
  transition: transform 0.5s ease;
}

/* Inner wobble group — separate from outer so it doesn't conflict with the transition */
.tonearm-wobble {
  transform-box: fill-box;
  /* Bounding box ≈ x:(-30→281), y:(-11→20). Pivot at (0,0) is ~9% from left, ~35% from top */
  transform-origin: 9% 35%;
}

@keyframes armWobble {
  0%   { transform: rotate(-0.06deg); }
  35%  { transform: rotate(0.05deg);  }
  65%  { transform: rotate(-0.04deg); }
  100% { transform: rotate(0.06deg);  }
}

.tonearm-wobble.wobbling {
  animation: armWobble 1.1s ease-in-out infinite alternate;
}
</style>

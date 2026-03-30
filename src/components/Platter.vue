<template>
  <g :transform="`translate(${cx}, ${cy})`">
    <!-- Platter -->
    <circle :r="PLATTER_R" fill="var(--color-platter)" />
    <!-- Felt mat -->
    <circle :r="FELT_R" fill="var(--color-felt)" />
    <!-- Spindle -->
    <circle :r="SPINDLE_R" fill="var(--color-plinth-trim, #f5eed8)" />
  </g>
</template>

<script setup>
defineProps({
  cx: { type: Number, default: 0 },
  cy: { type: Number, default: 0 },
})

// These must match the constants used in Record.vue and Turntable.vue
const PLATTER_R = 185
const FELT_R    = 175
const SPINDLE_R = 6
</script>

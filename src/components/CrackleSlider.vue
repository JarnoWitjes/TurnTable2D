<template>
  <div class="crackle-slider">
    <div class="slider-header">
      <label class="slider-label">Wear</label>
      <span class="grade-label">{{ gradeLabel }}</span>
    </div>
    <input
      type="range"
      min="0"
      max="100"
      :value="modelValue"
      :style="trackStyle"
      @input="$emit('update:modelValue', Number($event.target.value))"
    />
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Number, default: 30 },
})
defineEmits(['update:modelValue'])

const gradeLabel = computed(() => {
  const v = props.modelValue
  if (v <= 15) return 'Mint'
  if (v <= 35) return 'VG+'
  if (v <= 60) return 'VG'
  if (v <= 80) return 'Good'
  return 'Well Loved'
})

const trackStyle = computed(() =>
  `background: linear-gradient(to right, var(--color-brass) ${props.modelValue}%, var(--color-plinth-trim) ${props.modelValue}%)`
)
</script>

<style scoped>
.crackle-slider {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.slider-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.slider-label {
  font-family: 'Libre Baskerville', serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.grade-label {
  font-family: 'Libre Baskerville', serif;
  font-size: 0.75rem;
  font-style: italic;
  color: var(--color-brass);
}

input[type='range'] {
  -webkit-appearance: none;
  appearance: none;
  width: 180px;
  height: 4px;
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

input[type='range']::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--color-brass);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  cursor: pointer;
}

input[type='range']::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border: none;
  border-radius: 50%;
  background: var(--color-brass);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  cursor: pointer;
}
</style>

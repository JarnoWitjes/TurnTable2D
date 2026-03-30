<template>
  <div class="controls" v-if="hasRecord">
    <button class="ctrl-btn" @click="onPlayPause" :title="isPlaying ? 'Pause' : 'Play'">
      <svg v-if="!isPlaying" viewBox="0 0 24 24" class="ctrl-icon">
        <polygon points="5,3 19,12 5,21" fill="currentColor" />
      </svg>
      <svg v-else viewBox="0 0 24 24" class="ctrl-icon">
        <rect x="5" y="3" width="4" height="18" fill="currentColor" />
        <rect x="15" y="3" width="4" height="18" fill="currentColor" />
      </svg>
    </button>

    <button class="ctrl-btn" @click="$emit('stop')" title="Stop">
      <svg viewBox="0 0 24 24" class="ctrl-icon">
        <rect x="4" y="4" width="16" height="16" fill="currentColor" />
      </svg>
    </button>

    <button class="ctrl-btn ctrl-btn--eject" @click="$emit('eject')" title="Eject">
      <svg viewBox="0 0 24 24" class="ctrl-icon">
        <polygon points="12,3 21,15 3,15" fill="currentColor" />
        <rect x="3" y="17" width="18" height="3" fill="currentColor" />
      </svg>
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  isPlaying: { type: Boolean, default: false },
  hasRecord: { type: Boolean, default: false },
})

const emit = defineEmits(['play', 'pause', 'stop', 'eject'])

function onPlayPause() {
  emit(props.isPlaying ? 'pause' : 'play')
}
</script>

<style scoped>
.controls {
  display: flex;
  gap: 1rem;
  justify-content: center;
  align-items: center;
  padding: 1rem 0;
}

.ctrl-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid var(--color-brass);
  background: var(--color-plinth);
  color: var(--color-plinth-trim);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}

.ctrl-btn:hover {
  background: #5a3d22;
  transform: scale(1.08);
}

.ctrl-btn--eject {
  border-color: #8b5e1a;
  opacity: 0.85;
}

.ctrl-icon {
  width: 20px;
  height: 20px;
}
</style>

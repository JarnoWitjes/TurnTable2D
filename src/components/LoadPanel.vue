<template>
  <div class="load-panel">
    <h2 class="load-title">Load a Record</h2>
    <p class="load-subtitle">Choose a format to begin</p>

    <div class="load-buttons">
      <button class="load-btn" :disabled="loading" @click="triggerSingle">
        <span class="btn-label">Load Single</span>
        <span class="btn-sub">45 RPM · one file</span>
      </button>
      <button class="load-btn" :disabled="loading" @click="triggerAlbum">
        <span class="btn-label">Load Album</span>
        <span class="btn-sub">33 RPM · multiple files</span>
      </button>
    </div>

    <p v-if="loading" class="load-status">Decoding audio…</p>
    <p v-if="error" class="load-error">{{ error }}</p>

    <!-- Hidden file inputs -->
    <input
      ref="singleInput"
      type="file"
      accept="audio/*"
      style="display:none"
      @change="onSingleFile"
    />
    <input
      ref="albumInput"
      type="file"
      accept="audio/*"
      multiple
      style="display:none"
      @change="onAlbumFiles"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAlbumSides } from '../composables/useAlbumSides.js'

const emit = defineEmits(['loaded'])

const singleInput = ref(null)
const albumInput  = ref(null)
const loading     = ref(false)
const error       = ref('')

function triggerSingle() { singleInput.value.click() }
function triggerAlbum()  { albumInput.value.click() }

async function decodeFile(file, ctx) {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = await ctx.decodeAudioData(arrayBuffer)
  return { name: file.name.replace(/\.[^/.]+$/, ''), duration: buffer.duration, buffer }
}

async function onSingleFile(e) {
  const file = e.target.files[0]
  if (!file) return
  error.value = ''
  loading.value = true
  try {
    const ctx = new AudioContext()
    const track = await decodeFile(file, ctx)
    await ctx.close()
    const sides = { A: [track], B: [] }
    emit('loaded', { mode: 'single', rpm: 45, sides })
  } catch (err) {
    error.value = `Failed to decode: ${err.message}`
  } finally {
    loading.value = false
    e.target.value = ''
  }
}

async function onAlbumFiles(e) {
  const files = Array.from(e.target.files)
  if (!files.length) return
  error.value = ''
  loading.value = true
  try {
    // Sort alphabetically by filename
    files.sort((a, b) => a.name.localeCompare(b.name))
    const ctx = new AudioContext()
    const tracks = await Promise.all(files.map(f => decodeFile(f, ctx)))
    await ctx.close()
    const sides = useAlbumSides(tracks)
    emit('loaded', { mode: 'album', rpm: 33, sides })
  } catch (err) {
    error.value = `Failed to decode: ${err.message}`
  } finally {
    loading.value = false
    e.target.value = ''
  }
}
</script>

<style scoped>
.load-panel {
  text-align: center;
  padding: 2rem 1rem;
}

.load-title {
  font-size: 1.6rem;
  font-weight: 700;
  margin-bottom: 0.4rem;
  color: var(--color-text);
}

.load-subtitle {
  font-size: 0.95rem;
  opacity: 0.65;
  margin-bottom: 2rem;
  font-style: italic;
}

.load-buttons {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.load-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 1.1rem 2.2rem;
  background: var(--color-plinth);
  color: var(--color-plinth-trim);
  border: 2px solid var(--color-brass);
  border-radius: 10px;
  cursor: pointer;
  font-family: 'Libre Baskerville', serif;
  transition: background 0.2s, transform 0.1s;
}

.load-btn:hover:not(:disabled) {
  background: #5a3d22;
  transform: translateY(-1px);
}

.load-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-label {
  font-size: 1.05rem;
  font-weight: 700;
}

.btn-sub {
  font-size: 0.75rem;
  opacity: 0.7;
  font-style: italic;
}

.load-status {
  margin-top: 1.2rem;
  font-style: italic;
  opacity: 0.7;
}

.load-error {
  margin-top: 1rem;
  color: #c0392b;
  font-size: 0.9rem;
}
</style>

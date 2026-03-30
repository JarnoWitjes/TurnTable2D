# CLAUDE.md — Vinyl Turntable Web App

## Project Overview

A retro-styled, interactive 2D vinyl turntable simulation built with Vue 3. Users can load audio as either a **single** (45 RPM) or an **album** (33 RPM, two sides), then watch an animated tonearm track across a spinning record while synthetic vinyl noise adds atmosphere. The visual style is a warm, flat retro illustration — think vintage hi-fi brochure.

---

## Tech Stack

- **Framework:** Vue 3 (Composition API with `<script setup>`)
- **Build tool:** Vite
- **Audio:** Web Audio API (no external audio libraries)
- **Styling:** CSS (scoped per component), no CSS framework
- **No backend** — everything runs in the browser

---

## Application Modes

### Single Mode
- User uploads **one audio file**
- Treated as a **45 RPM** single
- One side only
- Record label design: small centre label, classic single proportions

### Album Mode
- User uploads **multiple audio files at once** (via a multi-file picker)
- Tracks are **automatically sorted** (by filename) and **distributed across two sides**
- Each side has a target maximum of **~20 minutes** — if a track would push a side over 20 min, it starts the next side instead. Never cut a track off mid-file.
- Album defaults to **33 RPM**, but user can toggle to **45 RPM**
- UI shows which side is currently playing (Side A / Side B) with a flip animation when switching

---

## Turntable Visual Design

### Style
- **Flat retro illustration**, 2D top-down perspective
- **Colour palette:** warm browns, creams, and tans — think aged wood veneer, parchment, and brass accents
- Avoid gradients where flat colour works; use subtle shadows (CSS `box-shadow` or SVG `filter`) sparingly for depth

### Components to render (all SVG or CSS-drawn — no image assets required)

#### Plinth (base)
- Rounded rectangle
- Warm dark-brown wood-grain texture (CSS repeating linear gradient to suggest grain)
- Cream/off-white trim

#### Platter & Record
- Circular platter in dark grey/charcoal
- When **no record is loaded**: platter is bare (show felt mat in muted olive/dark green)
- When **record is loaded**:
  - Black vinyl record sits on the platter
  - Concentric groove rings (SVG circles, subtle opacity — not every groove, just enough to suggest texture)
  - Centre label: circular, warm cream background, stylised retro typography (project name or track name)
  - Record and platter **rotate** when playing (CSS animation, `transform: rotate`)
  - Rotation speed matches RPM: 33 RPM = one revolution per ~1.82s, 45 RPM = one revolution per ~1.33s

#### Tonearm
- Mounted at the bottom-right of the platter
- Consists of:
  - **Pivot base** — small filled circle (brass/gold colour)
  - **Arm** — a slightly tapered rectangle/line, angled
  - **Headshell** — small rectangular tip at the business end
  - **Stylus** — tiny vertical line dropping from headshell tip
- Arm rotates around the pivot point using CSS `transform-origin`

#### Spindle
- Small circle at the exact centre of the platter, cream/silver

---

## Tonearm Animation

The tonearm angle maps **linearly** to playback position:

```
angle = ANGLE_START + (elapsed / total_duration) * (ANGLE_END - ANGLE_START)
```

- `ANGLE_START` — arm points to the outer groove edge (approximately −28° from resting position)
- `ANGLE_END` — arm points to the inner groove edge (approximately +28° from resting position, near label)
- `ANGLE_REST` — arm parked off the record to the right (~+45° or wherever it looks natural)

### Tonearm movement states:
1. **Resting** — arm is parked off the record
2. **Cueing down** — on Play, arm sweeps smoothly to `ANGLE_START` over ~1 second (CSS transition)
3. **Playing** — arm moves in real time via `requestAnimationFrame` loop reading `AudioContext.currentTime`
4. **Lifting** — at end of side, arm sweeps back to rest position over ~1 second
5. **Between sides (album)** — arm lifts, user prompted to flip (or auto-flips after short delay — make this a setting)

---

## Audio Engine (Web Audio API)

### Playback
- Decode uploaded files with `AudioContext.decodeAudioData`
- Play via `AudioBufferSourceNode`
- For albums, queue tracks sequentially — when one ends, the next begins automatically within the same side

### Vinyl Noise Synthesis
Generate two layers of synthetic noise, always running while a record is loaded and playing:

#### Layer 1 — Continuous Surface Hiss
- White noise via `ScriptProcessorNode` or `AudioWorkletNode` (prefer Worklet for performance)
- Filter through a `BiquadFilterNode` (highpass ~4 kHz) to give it an airy, surface-noise character
- Very low gain (nearly inaudible but present)

#### Layer 2 — Random Pops & Crackles
- Scheduled using a Poisson process: random intervals with a configurable mean rate
- Each event: a short burst of filtered noise (~5–30 ms), shaped with a fast attack / fast decay gain envelope
- Two sub-types:
  - **Crackle** — very short (~5 ms), highpass filtered, high pitch
  - **Pop** — slightly longer (~20–30 ms), bandpass filtered, lower pitch

#### Crackle Intensity Control
A single **intensity slider** (0–100) maps to:
- Surface hiss gain level
- Pop/crackle event rate (events per minute)
- Pop amplitude range

At 0: near-silent, pristine. At 100: well-worn, lively crackle.

---

## UI Controls

### Header / Toolbar
- App title in retro serif font (use a Google Font: **Playfair Display** or **Libre Baskerville**)
- RPM toggle: `33` / `45` pill buttons (only active in album mode; fixed at 45 for singles)
- **Crackle Intensity** slider — labelled "Wear", range 0–100, default 30
- **Side indicator** (album mode only): "▶ Side A" / "Side B"

### Record Loading Panel
Shown when no record is loaded, hidden once loaded:
- Two buttons: **"Load Single"** and **"Load Album"**
- File input (hidden, triggered by button click)
  - Single: `accept="audio/*"`, single file
  - Album: `accept="audio/*"`, `multiple`

### Transport Controls (shown once record is loaded)
- **Play / Pause** — standard icons
- **Stop** — returns tonearm to rest, resets position
- **Eject** — unloads record, returns to empty platter state
- (Album only) **Flip Side** button — lifts arm, switches to other side

### Progress / Info Bar
- Current track name
- Elapsed time / total side time
- Side fill indicator: simple bar showing how full each side is (useful at load time)

---

## Component Structure

```
src/
├── App.vue                  # Root: layout, global state
├── components/
│   ├── Turntable.vue        # SVG/CSS turntable illustration, handles all visual state
│   ├── Tonearm.vue          # Tonearm SVG, receives `angle` prop
│   ├── Record.vue           # Vinyl record SVG (groove rings, label, rotation)
│   ├── Platter.vue          # Platter + felt mat base
│   ├── Controls.vue         # Play/pause/stop/eject/flip
│   ├── LoadPanel.vue        # File upload UI
│   ├── CrackleSlider.vue    # Wear/intensity slider
│   └── SideInfo.vue         # Side A/B info, track list, timings
├── composables/
│   ├── useAudioEngine.js    # Web Audio API: playback, queuing, timing
│   ├── useVinylNoise.js     # Synthetic hiss, pops, crackle synthesis
│   └── useAlbumSides.js     # Track-to-side assignment logic
└── utils/
    └── formatTime.js        # mm:ss helper
```

---

## State Shape (global, in App.vue or a Pinia store)

```js
{
  mode: null | 'single' | 'album',  // null = no record loaded
  rpm: 33 | 45,
  isPlaying: false,
  currentSide: 'A' | 'B',
  currentTrackIndex: 0,             // index within current side's track list
  elapsed: 0,                       // seconds elapsed on current side
  sides: {
    A: [{ name, duration, buffer }],
    B: [{ name, duration, buffer }],
  },
  crackleIntensity: 30,             // 0–100
  tonearmAngle: ANGLE_REST,
}
```

---

## Key Constraints & Notes

- **Never cut audio.** When splitting tracks across album sides, always keep each file whole. If a track doesn't fit the 20-minute target, it starts the next side.
- **AudioContext must be created/resumed on a user gesture** (browser policy). Trigger on the first Play button press.
- The tonearm angle update loop should use `requestAnimationFrame` and read from `AudioContext.currentTime` for accuracy — do not rely on `setInterval`.
- All turntable visuals should be **purely CSS/SVG** — no raster images or external assets (except the optional Google Font).
- The crackle engine should keep running even during Pause (so the record "sitting still but playing" is silent), but stop when Stopped or Ejected. Actually: pause crackle on pause, resume on play. Stop/eject silences everything.
- Mobile-friendliness is **nice to have, not required** — optimise for desktop first.

---

## Suggested Development Order

1. Static turntable illustration (plinth, platter, tonearm, empty state)
2. Record component with groove rings and spinning animation
3. File loading & album side-splitting logic (`useAlbumSides`)
4. Basic audio playback & queuing (`useAudioEngine`)
5. Tonearm real-time tracking animation
6. Vinyl noise synthesis (`useVinylNoise`) + crackle slider
7. RPM toggle + rotation speed sync
8. UI polish: transitions, fonts, colour refinement
9. Edge cases: very short tracks, single-track albums, files longer than 20 min

---

## Out of Scope (for now)

- Pitch/speed control beyond RPM toggle
- Recording or exporting audio
- Saving sessions / localStorage persistence
- Equaliser or tone controls
- Multiple tonearms or cartridges
- Actual waveform visualisation

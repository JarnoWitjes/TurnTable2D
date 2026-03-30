const SIDE_MAX_DURATION = 1200 // 20 minutes in seconds

/**
 * Distribute tracks across two album sides.
 * @param {Array<{name: string, duration: number, buffer: AudioBuffer}>} tracks
 * @returns {{ A: Array, B: Array }}
 */
export function useAlbumSides(tracks) {
  const sides = { A: [], B: [] }
  let sideADuration = 0

  for (const track of tracks) {
    if (sideADuration + track.duration <= SIDE_MAX_DURATION) {
      sides.A.push(track)
      sideADuration += track.duration
    } else {
      sides.B.push(track)
    }
  }

  return sides
}

/**
 * Compute total duration of a side's track list.
 * @param {Array<{duration: number}>} tracks
 * @returns {number} seconds
 */
export function sideTotalDuration(tracks) {
  return tracks.reduce((sum, t) => sum + t.duration, 0)
}

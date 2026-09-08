/**
 * Maps a temperature to a pastel "thermal" color — cool blue through warm
 * amber to hot coral-red — used purely to color the engine diagram's flow
 * duct and particles. Presentation-only, like format.js: it never feeds
 * back into the physics, it just colors numbers `solveEngine` already
 * produced.
 */

const COLD = [142, 198, 240]; // pastel sky blue
const MID = [255, 212, 121]; // pastel amber
const HOT = [255, 111, 97]; // pastel coral-red

function lerp3(a, b, t) {
  return a.map((c, i) => Math.round(c + (b[i] - c) * t));
}

/** tNorm: 0 (coldest) .. 1 (hottest) -> an "rgb(r, g, b)" string. */
export function heatColor(tNorm) {
  const t = Math.min(1, Math.max(0, tNorm));
  const [r, g, b] = t < 0.5 ? lerp3(COLD, MID, t * 2) : lerp3(MID, HOT, (t - 0.5) * 2);
  return `rgb(${r}, ${g}, ${b})`;
}

/** Normalizes T against the profile's own min/max, then maps to a color. */
export function stationHeatColor(T, tMin, tMax) {
  if (!Number.isFinite(T) || tMax <= tMin) return heatColor(0.5);
  return heatColor((T - tMin) / (tMax - tMin));
}


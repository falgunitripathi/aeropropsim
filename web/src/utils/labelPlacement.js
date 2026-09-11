/**
 * Tiny greedy label-placement helper for small SVG scatter/line charts.
 *
 * Problem this solves: a handful of data-point labels, each anchored near
 * its own point, that can visually collide when two points sit close
 * together (a common complaint on the T-s/P-v process diagrams and the
 * per-station trend charts, which all plot a small, fixed number of
 * points that can bunch up depending on the configured engine).
 *
 * This is intentionally simple — not a general force-directed label
 * layout. For each point, in order, it tries a short list of candidate
 * offsets (by default: above-right, above-left, below-right, below-left,
 * straight up, straight down) and picks the first one whose estimated
 * text bounding box doesn't overlap any label already placed. If every
 * candidate collides (rare with this few points), it falls back to the
 * first candidate rather than leaving the label unplaced — a slightly
 * crowded label beats a missing one.
 */

const DEFAULT_CANDIDATES = [
  { dx: 8, dy: -8, anchor: "start" }, // above-right
  { dx: -8, dy: -8, anchor: "end" }, // above-left
  { dx: 8, dy: 18, anchor: "start" }, // below-right
  { dx: -8, dy: 18, anchor: "end" }, // below-left
  { dx: 0, dy: -14, anchor: "middle" }, // straight up
  { dx: 0, dy: 22, anchor: "middle" }, // straight down
];

function textBox(px, py, text, candidate, estCharWidth, estHeight) {
  const w = Math.max(String(text).length * estCharWidth, estCharWidth * 2);
  const x = px + candidate.dx - (candidate.anchor === "end" ? w : candidate.anchor === "middle" ? w / 2 : 0);
  // Text baseline sits near the bottom of its box, not the top.
  const y = py + candidate.dy - estHeight * 0.8;
  return { x0: x, y0: y, x1: x + w, y1: y + estHeight };
}

function boxesOverlap(a, b) {
  return !(a.x1 < b.x0 || a.x0 > b.x1 || a.y1 < b.y0 || a.y0 > b.y1);
}

/**
 * @param {Array<{x: number, y: number, text: string}>} points - pixel
 *   positions (already scaled to the SVG viewBox) and the label text that
 *   will be drawn at each one.
 * @param {{estCharWidth?: number, estHeight?: number, candidates?: object[]}} [opts]
 * @returns {Array<{dx: number, dy: number, anchor: "start"|"middle"|"end"}>}
 *   one offset per input point, same order.
 */
export function resolveLabelOffsets(points, opts = {}) {
  const estCharWidth = opts.estCharWidth ?? 5.6;
  const estHeight = opts.estHeight ?? 13;
  const candidates = opts.candidates ?? DEFAULT_CANDIDATES;

  const placedBoxes = [];
  const offsets = [];

  for (const p of points) {
    let chosen = candidates[0];
    let chosenBox = textBox(p.x, p.y, p.text, chosen, estCharWidth, estHeight);
    let found = false;
    for (const candidate of candidates) {
      const box = textBox(p.x, p.y, p.text, candidate, estCharWidth, estHeight);
      if (!placedBoxes.some((b) => boxesOverlap(box, b))) {
        chosen = candidate;
        chosenBox = box;
        found = true;
        break;
      }
    }
    if (!found) {
      // Nothing was collision-free — keep the first candidate so every
      // point still gets a label, just accept it may sit close to another.
      chosen = candidates[0];
      chosenBox = textBox(p.x, p.y, p.text, chosen, estCharWidth, estHeight);
    }
    placedBoxes.push(chosenBox);
    offsets.push(chosen);
  }

  return offsets;
}

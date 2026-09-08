/**
 * Small formatting helpers shared by the results views. Kept separate
 * from the physics module — these are presentation-only and must never
 * feed back into solveEngine.
 */

export function fmt(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Pa -> kPa, formatted. */
export function fmtKPa(pa, digits = 2) {
  if (pa === null || pa === undefined || Number.isNaN(pa)) return "—";
  return fmt(pa / 1000.0, digits);
}

/** A ratio (0-1) -> a percentage string. */
export function fmtPct(ratio, digits = 1) {
  if (ratio === null || ratio === undefined || Number.isNaN(ratio)) return "—";
  return `${fmt(ratio * 100.0, digits)}%`;
}

/** kg/(N·s) -> kg/(N·h), the conventional TSFC reporting unit. */
export function tsfcPerHour(tsfcPerSecond) {
  if (tsfcPerSecond === null || tsfcPerSecond === undefined || Number.isNaN(tsfcPerSecond)) return null;
  return tsfcPerSecond * 3600.0;
}

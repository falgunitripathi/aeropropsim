/**
 * The set of engine inputs users can sweep/search over, shared by
 * ParameterSweep.jsx and SensitivityOptimizer.jsx so both tools vary the
 * same parameters over the same sensible ranges.
 */
export const SWEEP_PARAMS = [
  {
    key: "altitude_m", label: "Altitude", unit: "m",
    min: 0, max: 11000, defaultMin: 0, defaultMax: 11000, rangeStep: 100, axisDecimals: 0,
  },
  {
    key: "mach_flight", label: "Flight Mach number", unit: "M",
    min: 0, max: 3, defaultMin: 0, defaultMax: 2, rangeStep: 0.05, axisDecimals: 2,
  },
  {
    key: "pi_c", label: "Compressor pressure ratio", unit: "π_c",
    min: 1.5, max: 40, defaultMin: 4, defaultMax: 24, rangeStep: 0.5, axisDecimals: 1,
  },
  {
    key: "T04", label: "Turbine inlet temperature", unit: "K",
    min: 800, max: 2200, defaultMin: 1000, defaultMax: 1800, rangeStep: 25, axisDecimals: 0,
  },
];

/** `n` evenly spaced values from `min` to `max`, inclusive. */
export function linspace(min, max, n) {
  if (n <= 1) return [min];
  const step = (max - min) / (n - 1);
  return Array.from({ length: n }, (_, i) => min + step * i);
}

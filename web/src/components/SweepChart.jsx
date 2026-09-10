const WIDTH = 300;
const HEIGHT = 150;
const PAD_L = 42;
const PAD_R = 16;
const PAD_T = 14;
const PAD_B = 28;

/** Evenly spaced tick values from lo to hi (inclusive), `count` of them. */
function ticks(lo, hi, count) {
  if (lo === hi) return [lo];
  const step = (hi - lo) / (count - 1);
  return Array.from({ length: count }, (_, i) => lo + step * i);
}

/**
 * Generic single-series line chart for a parameter sweep — x is the swept
 * input's continuous value, y is one output metric. One chart per output
 * (a "small multiple"): per the dataviz rules, different-unit measures
 * never share an axis, so thrust/TSFC/efficiency each get their own
 * single-hue chart rather than being layered with a second y-axis. A
 * `null`/non-finite y (an infeasible design point) breaks the line into a
 * gap rather than being interpolated across.
 */
export default function SweepChart({
  title, xValues, yValues, unit, color, decimals = 1, xUnit, xDecimals = 1,
  bestIndex = null,
}) {
  const known = yValues.filter((v) => v !== null && v !== undefined && Number.isFinite(v));
  if (known.length === 0) {
    return (
      <div className="sweep-chart-card">
        <div className="sweep-chart-title">{title}</div>
        <p className="section-note">No physically valid points in this range.</p>
      </div>
    );
  }

  const yMin = Math.min(...known);
  const yMax = Math.max(...known);
  const ySpan = yMax - yMin || Math.abs(yMax) || 1;
  const yLo = yMin - ySpan * 0.12;
  const yHi = yMax + ySpan * 0.12;

  const xMin = xValues[0];
  const xMax = xValues[xValues.length - 1];
  const xSpan = xMax - xMin || 1;

  const px = (x) => PAD_L + ((x - xMin) / xSpan) * (WIDTH - PAD_L - PAD_R);
  const py = (y) => HEIGHT - PAD_B - ((y - yLo) / (yHi - yLo)) * (HEIGHT - PAD_T - PAD_B);

  const segments = [];
  let current = [];
  xValues.forEach((x, i) => {
    const y = yValues[i];
    if (y === null || y === undefined || !Number.isFinite(y)) {
      if (current.length) segments.push(current);
      current = [];
    } else {
      current.push([x, y]);
    }
  });
  if (current.length) segments.push(current);

  const yTicks = ticks(yLo, yHi, 4);
  const xTicks = [xMin, (xMin + xMax) / 2, xMax];

  let lastKnownIdx = -1;
  for (let i = yValues.length - 1; i >= 0; i--) {
    if (yValues[i] !== null && yValues[i] !== undefined && Number.isFinite(yValues[i])) {
      lastKnownIdx = i;
      break;
    }
  }

  const rangeSummary = `ranges from ${yMin.toFixed(decimals)}${unit ? ` ${unit}` : ""} to ${yMax.toFixed(decimals)}${unit ? ` ${unit}` : ""} over ${xMin.toFixed(xDecimals)}${xUnit ? ` ${xUnit}` : ""} to ${xMax.toFixed(xDecimals)}${xUnit ? ` ${xUnit}` : ""}`;
  const bestSummary = (bestIndex !== null && bestIndex !== undefined && Number.isFinite(yValues[bestIndex]))
    ? `; best point at ${xValues[bestIndex].toFixed(xDecimals)}${xUnit ? ` ${xUnit}` : ""}: ${yValues[bestIndex].toFixed(decimals)}${unit ? ` ${unit}` : ""}`
    : "";

  return (
    <div className="sweep-chart-card">
      <div className="sweep-chart-title">{title}</div>
      <svg
        className="sweep-chart-svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`${title} versus swept parameter, ${rangeSummary}${bestSummary}.`}
      >
        {yTicks.map((t, i) => (
          <line
            key={`gy${i}`}
            className="sweep-chart-gridline"
            x1={PAD_L} x2={WIDTH - PAD_R} y1={py(t)} y2={py(t)}
          />
        ))}
        <line className="sweep-chart-axis" x1={PAD_L} x2={PAD_L} y1={PAD_T} y2={HEIGHT - PAD_B} />
        <line className="sweep-chart-axis" x1={PAD_L} x2={WIDTH - PAD_R} y1={HEIGHT - PAD_B} y2={HEIGHT - PAD_B} />
        {yTicks.map((t, i) => (
          <text key={`ty${i}`} className="sweep-chart-tick" x={PAD_L - 6} y={py(t) + 3} textAnchor="end">
            {t.toFixed(decimals)}
          </text>
        ))}
        {xTicks.map((t, i) => (
          <text key={`tx${i}`} className="sweep-chart-tick" x={px(t)} y={HEIGHT - PAD_B + 15} textAnchor="middle">
            {t.toFixed(xDecimals)}{xUnit ? ` ${xUnit}` : ""}
          </text>
        ))}
        {segments.map((seg, si) => (
          <path
            key={`seg${si}`}
            className="sweep-chart-line"
            stroke={color}
            d={seg.map(([x, y], i) => `${i === 0 ? "M" : "L"}${px(x).toFixed(2)},${py(y).toFixed(2)}`).join(" ")}
          />
        ))}
        {xValues.map((x, i) => {
          const y = yValues[i];
          if (y === null || y === undefined || !Number.isFinite(y)) return null;
          return (
            <circle key={`d${i}`} className="sweep-chart-dot" cx={px(x)} cy={py(y)} r={4} fill={color}>
              <title>
                {`${x.toFixed(xDecimals)}${xUnit ? ` ${xUnit}` : ""} → ${y.toFixed(decimals)}${unit ? ` ${unit}` : ""}`}
              </title>
            </circle>
          );
        })}
        {lastKnownIdx >= 0 && bestIndex !== lastKnownIdx && (
          <text
            className="sweep-chart-endlabel"
            x={px(xValues[lastKnownIdx]) - 6}
            y={py(yValues[lastKnownIdx]) - 8}
            textAnchor="end"
          >
            {yValues[lastKnownIdx].toFixed(decimals)}{unit ? ` ${unit}` : ""}
          </text>
        )}
        {bestIndex !== null && bestIndex !== undefined && Number.isFinite(yValues[bestIndex]) && (
          <>
            <circle
              className="sweep-chart-best-ring"
              cx={px(xValues[bestIndex])}
              cy={py(yValues[bestIndex])}
              r={7}
            />
            <text
              className="sweep-chart-best-label"
              x={px(xValues[bestIndex])}
              y={py(yValues[bestIndex]) - 12}
              textAnchor="middle"
            >
              best: {yValues[bestIndex].toFixed(decimals)}{unit ? ` ${unit}` : ""}
            </text>
          </>
        )}
      </svg>

      <table className="sr-only">
        <caption>{title} data (same values as the chart above)</caption>
        <thead>
          <tr>
            <th scope="col">{xUnit ? `Swept value (${xUnit})` : "Swept value"}</th>
            <th scope="col">{unit ? `${title} (${unit})` : title}</th>
          </tr>
        </thead>
        <tbody>
          {xValues.map((x, i) => {
            const y = yValues[i];
            const yText = (y === null || y === undefined || !Number.isFinite(y)) ? "—" : y.toFixed(decimals);
            return (
              <tr key={i}>
                <th scope="row">{x.toFixed(xDecimals)}</th>
                <td>{yText}{i === bestIndex ? " (best)" : ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


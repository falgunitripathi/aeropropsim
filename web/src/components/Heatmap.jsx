const PAD_L = 54;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 30;
const CELL = 26;

/** Hex color -> "r, g, b" for use inside an rgba() string. */
function hexToRgb(hex) {
  const m = hex.replace("#", "");
  const r = parseInt(m.substring(0, 2), 16);
  const g = parseInt(m.substring(2, 4), 16);
  const b = parseInt(m.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

/**
 * A single-hue grid heatmap for a 2-parameter search: one cell per
 * (xValues[col], yValues[row]) combination, shaded darker the closer that
 * cell is to the optimum (direction-aware via `betterIsHigher`) — never a
 * multi-hue/diverging scale, per the single-hue-per-series dataviz rule.
 * The best cell overall gets a highlighted outline and marker.
 */
export default function Heatmap({
  xValues, yValues, grid, color, betterIsHigher, best, decimals = 1, unit = "",
  xLabel, yLabel, xUnit, yUnit, xDecimals = 1, yDecimals = 1,
}) {
  const flat = grid.flat().filter((v) => v !== null && Number.isFinite(v));
  const rgb = hexToRgb(color);
  if (flat.length === 0) {
    return <p className="section-note">No physically valid points in this grid.</p>;
  }
  const vMin = Math.min(...flat);
  const vMax = Math.max(...flat);
  const vSpan = vMax - vMin || 1;

  const cols = xValues.length;
  const rows = yValues.length;
  const width = PAD_L + PAD_R + cols * CELL;
  const height = PAD_T + PAD_B + rows * CELL;

  const bestSummary = best
    ? `; best cell at ${xLabel} ${xValues[best.col].toFixed(xDecimals)}${xUnit ? ` ${xUnit}` : ""}, ${yLabel} ${yValues[best.row].toFixed(yDecimals)}${yUnit ? ` ${yUnit}` : ""}`
    : "";

  return (
    <div className="heatmap-wrap">
      <svg
        className="heatmap-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Heatmap of ${xLabel} versus ${yLabel}, values from ${vMin.toFixed(decimals)}${unit} to ${vMax.toFixed(decimals)}${unit}${bestSummary}. Full grid given as a table below.`}
      >
        {grid.map((row, ri) =>
          row.map((v, ci) => {
            const x = PAD_L + ci * CELL;
            // row 0 is yValues[0] (the range's low end) — draw it at the
            // bottom, so the chart reads bottom-to-top like a normal axis.
            const y = PAD_T + (rows - 1 - ri) * CELL;
            const valid = v !== null && Number.isFinite(v);
            const t = valid ? (betterIsHigher ? (v - vMin) / vSpan : (vMax - v) / vSpan) : 0;
            const alpha = valid ? 0.12 + t * 0.8 : 0;
            const isBest = best && best.row === ri && best.col === ci;
            return (
              <rect
                key={`${ri}-${ci}`}
                x={x} y={y} width={CELL} height={CELL}
                fill={valid ? `rgba(${rgb}, ${alpha.toFixed(3)})` : "transparent"}
                stroke={isBest ? color : "var(--border)"}
                strokeWidth={isBest ? 2.5 : 1}
              >
                <title>
                  {`${xLabel} = ${xValues[ci].toFixed(xDecimals)}${xUnit ? ` ${xUnit}` : ""}, `}
                  {`${yLabel} = ${yValues[ri].toFixed(yDecimals)}${yUnit ? ` ${yUnit}` : ""} → `}
                  {valid ? `${v.toFixed(decimals)}${unit}` : "infeasible"}
                </title>
              </rect>
            );
          })
        )}
        {/* Sparse axis ticks: low / mid / high only, per the dataviz rule
            against clutter. */}
        {[0, Math.floor((cols - 1) / 2), cols - 1].map((ci, i) => (
          <text
            key={`xt${i}`}
            className="heatmap-tick"
            x={PAD_L + ci * CELL + CELL / 2}
            y={PAD_T + rows * CELL + 14}
            textAnchor="middle"
          >
            {xValues[ci].toFixed(xDecimals)}
          </text>
        ))}
        {[0, Math.floor((rows - 1) / 2), rows - 1].map((ri, i) => (
          <text
            key={`yt${i}`}
            className="heatmap-tick"
            x={PAD_L - 6}
            y={PAD_T + (rows - 1 - ri) * CELL + CELL / 2 + 3}
            textAnchor="end"
          >
            {yValues[ri].toFixed(yDecimals)}
          </text>
        ))}
        <text className="heatmap-axis-label" x={PAD_L + (cols * CELL) / 2} y={height - 4} textAnchor="middle">
          {xLabel}{xUnit ? ` (${xUnit})` : ""}
        </text>
        <text
          className="heatmap-axis-label"
          x={12}
          y={PAD_T + (rows * CELL) / 2}
          textAnchor="middle"
          transform={`rotate(-90, 12, ${PAD_T + (rows * CELL) / 2})`}
        >
          {yLabel}{yUnit ? ` (${yUnit})` : ""}
        </text>
      </svg>

      <table className="sr-only">
        <caption>
          {xLabel}{xUnit ? ` (${xUnit})` : ""} versus {yLabel}{yUnit ? ` (${yUnit})` : ""} grid
          (same values as the heatmap above; rows are {yLabel}, columns are {xLabel})
        </caption>
        <thead>
          <tr>
            <th scope="col">{yLabel}{yUnit ? ` (${yUnit})` : ""} \ {xLabel}{xUnit ? ` (${xUnit})` : ""}</th>
            {xValues.map((x, ci) => (
              <th scope="col" key={ci}>{x.toFixed(xDecimals)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {yValues.map((y, ri) => (
            <tr key={ri}>
              <th scope="row">{y.toFixed(yDecimals)}</th>
              {xValues.map((_, ci) => {
                const v = grid[ri][ci];
                const valid = v !== null && Number.isFinite(v);
                const isBest = best && best.row === ri && best.col === ci;
                return (
                  <td key={ci}>
                    {valid ? `${v.toFixed(decimals)}${unit}` : "infeasible"}{isBest ? " (best)" : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

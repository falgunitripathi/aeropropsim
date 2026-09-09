import { fmt } from "../utils/format.js";

const ROW_H = 34;
const BAR_H = 7;
const MARGIN = { top: 10, right: 54, bottom: 30, left: 176 };
const WIDTH = 640;

/**
 * A tornado diagram: one horizontal pair of bars per parameter, both
 * anchored to a shared zero line (0% thrust change), sorted by impact
 * magnitude (largest at top). The "−step" bar (this parameter nudged down)
 * and the "+step" bar (nudged up) are a fixed two-series legend — which
 * bar ends up on which side of zero varies per row, since some parameters
 * help thrust when increased and others hurt it.
 */
export default function TornadoChart({ rows, stepPct }) {
  if (rows.length === 0) return null;

  const maxAbs = Math.max(
    0.5,
    ...rows.map((r) => Math.max(Math.abs(r.lowPct ?? 0), Math.abs(r.highPct ?? 0)))
  );
  const domain = maxAbs * 1.2;

  const plotW = WIDTH - MARGIN.left - MARGIN.right;
  const plotH = rows.length * ROW_H;
  const HEIGHT = MARGIN.top + plotH + MARGIN.bottom;
  const cx = MARGIN.left + plotW / 2;

  const xScale = (v) => cx + (v / domain) * (plotW / 2);

  const xTicks = [-domain, -domain / 2, 0, domain / 2, domain];

  return (
    <div className="tornado-chart">
      <div className="tornado-legend">
        <span className="tornado-legend-item">
          <span className="tornado-swatch tornado-swatch-low" /> −{fmt(stepPct, 0)}% nudge
        </span>
        <span className="tornado-legend-item">
          <span className="tornado-swatch tornado-swatch-high" /> +{fmt(stepPct, 0)}% nudge
        </span>
      </div>
      <svg
        className="tornado-svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="Tornado diagram of parameter sensitivity on thrust"
      >
        {xTicks.map((t, i) => (
          <line
            key={`g${i}`}
            className={t === 0 ? "tornado-zero-line" : "tornado-gridline"}
            x1={xScale(t)} x2={xScale(t)} y1={MARGIN.top} y2={MARGIN.top + plotH}
          />
        ))}
        {xTicks.map((t, i) => (
          <text key={`t${i}`} className="tornado-tick" x={xScale(t)} y={MARGIN.top + plotH + 16} textAnchor="middle">
            {t >= 0 ? "+" : ""}{fmt(t, 0)}%
          </text>
        ))}

        {rows.map((row, i) => {
          const y = MARGIN.top + i * ROW_H + ROW_H / 2;
          const lowKnown = row.lowPct !== null;
          const highKnown = row.highPct !== null;
          const lowX0 = lowKnown ? Math.min(xScale(0), xScale(row.lowPct)) : null;
          const lowW = lowKnown ? Math.abs(xScale(row.lowPct) - xScale(0)) : 0;
          const highX0 = highKnown ? Math.min(xScale(0), xScale(row.highPct)) : null;
          const highW = highKnown ? Math.abs(xScale(row.highPct) - xScale(0)) : 0;

          // Direct end-label only on whichever bar in this row reaches
          // further from zero, to keep labels sparse.
          const labelOnLow = Math.abs(row.lowPct ?? 0) >= Math.abs(row.highPct ?? 0);
          const labelPct = labelOnLow ? row.lowPct : row.highPct;
          const labelX = labelOnLow ? (lowKnown ? xScale(row.lowPct) : null) : (highKnown ? xScale(row.highPct) : null);
          const labelY = labelOnLow ? y - BAR_H - 4 : y + BAR_H + 11;

          return (
            <g key={row.key}>
              <text className="tornado-row-label" x={MARGIN.left - 10} y={y + 4} textAnchor="end">
                {row.label}
              </text>
              {lowKnown ? (
                <rect
                  className="tornado-bar-low"
                  x={lowX0} y={y - BAR_H - 1} width={Math.max(lowW, 1)} height={BAR_H} rx={2}
                >
                  <title>
                    {`${row.label}: ${fmt(row.low, row.digits)}${row.unit} → thrust ${row.lowPct >= 0 ? "+" : ""}${fmt(row.lowPct, 1)}%`}
                  </title>
                </rect>
              ) : (
                <text className="tornado-tick" x={cx} y={y - BAR_H + 5} textAnchor="middle">n/a</text>
              )}
              {highKnown ? (
                <rect
                  className="tornado-bar-high"
                  x={highX0} y={y + 2} width={Math.max(highW, 1)} height={BAR_H} rx={2}
                >
                  <title>
                    {`${row.label}: ${fmt(row.high, row.digits)}${row.unit} → thrust ${row.highPct >= 0 ? "+" : ""}${fmt(row.highPct, 1)}%`}
                  </title>
                </rect>
              ) : (
                <text className="tornado-tick" x={cx} y={y + BAR_H + 9} textAnchor="middle">n/a</text>
              )}
              {labelX !== null && labelPct !== null && (
                <text
                  className="tornado-value-label"
                  x={labelX}
                  y={labelY}
                  textAnchor={labelPct >= 0 ? "start" : "end"}
                >
                  {labelPct >= 0 ? "+" : ""}{fmt(labelPct, 1)}%
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

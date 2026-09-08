import { useEffect, useState } from "react";
import { useAnimatedNumber } from "../hooks/useAnimatedNumber.js";
import { fmt, fmtKPa } from "../utils/format.js";
import { stationHeatColor } from "../utils/heatColor.js";

/**
 * A live, clickable schematic of the engine being configured, drawn as a
 * half cutaway — the classic engineering convention for showing what's
 * inside a symmetric object: a solid riveted casing over the top half, an
 * axis-of-symmetry centerline, and the internal components exposed in the
 * "opened" lower half, with spinning compressor/turbine blades, a
 * multi-strand flow duct (cool near-white streaks warming to red as they
 * travel), and a flame that flickers in the combustor.
 *
 * Click any part — or a station marker — to pop up its values spelled
 * out in plain English next to it (see `partDetails`/`stationDetails`),
 * and use "Expand" to open the same live diagram larger in an overlay.
 * Purely illustrative: every number and color shown is derived directly
 * from `result` (see physics/engine.js); nothing here feeds back into
 * the solver.
 */

const VBOX_W = 920;
const VBOX_H = 200;
const CENTERLINE_Y = 100;
// Extra dead space reserved on each side of the viewBox purely so a
// station readout or part card centered (via translateX(-50%)) on a
// near-edge element has room to render without clipping against the
// scroll container's edge.
const MARGIN = 60;
const TOTAL_W = VBOX_W + MARGIN * 2;
const FLOW_Y = CENTERLINE_Y + 14;

const SECTION = {
  intake: { x0: 40, x1: 160 },
  compressor: { x0: 172, x1: 350 },
  combustor: { x0: 362, x1: 470 },
  turbine: { x0: 482, x1: 650 },
  nozzle: { x0: 662, x1: 860 },
};

const STATIONS = [
  { key: "a", x: 20, name: "Freestream" },
  { key: "2", x: SECTION.intake.x1, name: "Intake exit" },
  { key: "3", x: SECTION.compressor.x1, name: "Compressor exit" },
  { key: "4", x: SECTION.combustor.x1, name: "Combustor exit" },
  { key: "5", x: SECTION.turbine.x1, name: "Turbine exit" },
  { key: "9", x: SECTION.nozzle.x1, name: "Nozzle exit" },
];

// The upper-half casing silhouette, as (x, yOffsetFromCenterline) control
// points — bulging out around the compressor and turbine, tapering at
// the intake nose and nozzle exit. Deliberately angular, matching the
// schematic style of the intake/nozzle wedges rather than a photoreal
// render.
const CASING_TOP = [
  [4, -14], [40, -44], [160, -50], [220, -64], [300, -72], [350, -58],
  [400, -52], [440, -66], [470, -56], [520, -52], [590, -70], [650, -50],
  [700, -46], [800, -40], [860, -34],
];
const CASING_PATH = [
  `M ${CASING_TOP[0][0]} ${CENTERLINE_Y + CASING_TOP[0][1]}`,
  ...CASING_TOP.slice(1).map(([x, dy]) => `L ${x} ${CENTERLINE_Y + dy}`),
  `L ${CASING_TOP[CASING_TOP.length - 1][0]} ${CENTERLINE_Y}`,
  `L ${CASING_TOP[0][0]} ${CENTERLINE_Y}`,
  "Z",
].join(" ");
// A handful of rivets along the casing's outer skin — purely decorative,
// picked from every other control point so they read as a seam of
// fasteners rather than a repeating pattern.
const CASING_RIVETS = CASING_TOP.filter((_, i) => i > 0 && i < CASING_TOP.length - 1 && i % 2 === 0);

const FLOW_X0 = STATIONS[0].x;
const FLOW_X1 = STATIONS[STATIONS.length - 1].x;
// Several thin lanes instead of one thick duct — reads as an actual
// bundle of flow streamlines rather than a single fat pipe.
const FLOW_LANE_OFFSETS = [-6, -2, 2, 6];
const STREAKS_PER_LANE = 2;

/** Axial stage bars — count capped visually at 6 so a 12-stage compressor doesn't overplot. */
function StageBars({ x0, x1, count, growUp, className }) {
  const n = Math.max(1, Math.min(Math.round(count) || 1, 6));
  const w = (x1 - x0) / n;
  const bars = [];
  for (let i = 0; i < n; i++) {
    const frac = (i + 1) / n;
    const h = growUp ? 34 + frac * 52 : 86 - frac * 52;
    const x = x0 + i * w;
    bars.push(
      <rect
        key={i}
        x={x + 3}
        y={CENTERLINE_Y - h / 2}
        width={Math.max(w - 6, 4)}
        height={h}
        rx="3"
        className={className}
        opacity={0.5 + 0.5 * frac}
      />
    );
  }
  return <>{bars}</>;
}

/** A radial-wheel glyph for centrifugal compressors / radial turbines — its spokes spin continuously. */
function RadialWheel({ cx, cy, r, className, dur = "2s" }) {
  const spokes = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    spokes.push(
      <line
        key={i}
        x1={0}
        y1={0}
        x2={Math.cos(a) * (r - 6)}
        y2={Math.sin(a) * (r - 6)}
        className="ed-spoke"
      />
    );
  }
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <circle r={r} className={className} />
      <g>
        {spokes}
        <circle r={r * 0.22} className="ed-hub" />
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0"
          to="360"
          dur={dur}
          repeatCount="indefinite"
        />
      </g>
    </g>
  );
}

/** A small spinning pinwheel of blades, layered over the axial stage bars as a "moving parts" cue. */
function FanBlades({ cx, cy, r, count = 8, className, dur = "2.2s" }) {
  const blades = [];
  for (let i = 0; i < count; i++) {
    const angle = (360 / count) * i;
    blades.push(
      <path
        key={i}
        d={`M 0 ${-r * 0.16} L ${r * 0.82} ${-r * 0.34} L ${r} 0 L ${r * 0.82} ${r * 0.34} L 0 ${r * 0.16} Z`}
        transform={`rotate(${angle})`}
        className={className}
      />
    );
  }
  return (
    <g transform={`translate(${cx} ${cy})`}>
      <g>
        {blades}
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0"
          to="360"
          dur={dur}
          repeatCount="indefinite"
        />
      </g>
      <circle r={r * 0.2} className="ed-fan-hub" />
    </g>
  );
}

/** One flowing streak, riding a lane start to end, its color animating white (cool) to red (hot) in step with its own travel. */
function FlowStreak({ y, index, count }) {
  const dur = 2.6;
  const delay = (index / count) * -dur;
  return (
    <line x1="-16" y1="0" x2="0" y2="0" className="ed-flow-streak">
      <animateMotion
        dur={`${dur}s`}
        begin={`${delay}s`}
        repeatCount="indefinite"
        path={`M ${FLOW_X0} ${y} L ${FLOW_X1} ${y}`}
      />
      <animate
        attributeName="stroke"
        values="#ffffff;#ffd479;#ff6f61"
        dur={`${dur}s`}
        begin={`${delay}s`}
        repeatCount="indefinite"
      />
    </line>
  );
}

/** An SVG group that's both clickable and keyboard-activatable, for one engine part. */
function Clickable({ onSelect, label, children }) {
  return (
    <g
      className="ed-clickable"
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {children}
    </g>
  );
}

function StationReadout({ station, name, T0, p0, leftPct, onSelect }) {
  const animT = useAnimatedNumber(T0);
  const animP = useAnimatedNumber(p0 / 1000);
  return (
    <div
      className="station-readout"
      style={{ left: `${leftPct}%` }}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <span className="station-dot" aria-hidden="true" />
      <div className="station-card">
        <span className="station-tag">St. {station}</span>
        <span className="station-name">{name}</span>
        <span className="station-num">{fmt(animT, 0)} K</span>
        <span className="station-num station-num-muted">{fmt(animP, 0)} kPa</span>
      </div>
    </div>
  );
}

/** A small floating card of plain-English values, anchored above the part that was clicked. */
function PartCard({ details, leftPct, onClose }) {
  if (!details) return null;
  return (
    <div className="ed-part-card" style={{ left: `${leftPct}%` }}>
      <div className="ed-part-card-header">
        <span>{details.title}</span>
        <button type="button" className="ed-part-card-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      <div className="ed-part-card-body">
        {details.rows.map(([label, value]) => (
          <div className="ed-part-card-row" key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Plain-English value list for a clicked engine part (not a station marker). */
function partDetails(kind, result, config) {
  const { compressor, combustor, turbine, nozzle, stations } = result;
  switch (kind) {
    case "intake":
      return {
        title: "Intake",
        rows: [
          ["Inlet stagnation temperature", `${fmt(stations.a.T0, 1)} K`],
          ["Exit stagnation temperature", `${fmt(stations["2"].T0, 1)} K`],
          ["Exit stagnation pressure", `${fmtKPa(stations["2"].p0, 1)} kPa`],
        ],
      };
    case "compressor":
      return {
        title: `Compressor (${compressor.type})`,
        rows: [
          ["Inlet stagnation temperature", `${fmt(stations["2"].T0, 1)} K`],
          ["Exit stagnation temperature", `${fmt(stations["3"].T0, 1)} K`],
          ["Pressure ratio achieved", fmt(compressor.pi_actual, 3)],
          ["Stages", String(compressor.stages.length)],
          ...(compressor.type === "centrifugal"
            ? [["Blade tip speed U2 (you set this)", `${fmt(config.centrifugal_U2, 0)} m/s`]]
            : []),
        ],
      };
    case "combustor":
      return {
        title: "Combustor",
        rows: [
          ["Inlet stagnation temperature", `${fmt(stations["3"].T0, 1)} K`],
          ["Exit stagnation temperature (TIT)", `${fmt(stations["4"].T0, 1)} K`],
          ["Fuel-air ratio", fmt(combustor.f, 4)],
        ],
      };
    case "turbine":
      return {
        title: `Turbine (${turbine.type})`,
        rows: [
          ["Inlet stagnation temperature", `${fmt(stations["4"].T0, 1)} K`],
          ["Exit stagnation temperature", `${fmt(stations["5"].T0, 1)} K`],
          ["Expansion ratio achieved", fmt(1.0 / turbine.pr_actual, 3)],
          ...(turbine.type === "radial"
            ? [
                ["Spouting velocity (calculated)", `${fmt(turbine.V0_spouting, 1)} m/s`],
                ["Blade tip speed (calculated)", `${fmt(turbine.U2_sized, 1)} m/s`],
              ]
            : []),
        ],
      };
    case "nozzle":
      return {
        title: "Nozzle",
        rows: [
          ["Status", nozzle.choked ? "Choked" : "Unchoked (fully expanded)"],
          ["Exit temperature", `${fmt(nozzle.T_exit, 1)} K`],
          ["Exit pressure", `${fmtKPa(nozzle.p_exit, 1)} kPa`],
          ["Exit velocity", `${fmt(nozzle.V_exit, 1)} m/s`],
        ],
      };
    default:
      return null;
  }
}

/** Plain-English value list for a clicked station marker — the full row, spelled out. */
function stationDetails(key, name, st) {
  return {
    title: `Station ${key} — ${name}`,
    rows: [
      ["Stagnation temperature", `${fmt(st.T0, 1)} K`],
      ["Stagnation pressure", `${fmtKPa(st.p0, 1)} kPa`],
      ["Static temperature", `${fmt(st.T, 1)} K`],
      ["Static pressure", `${fmtKPa(st.p, 1)} kPa`],
      ["Mach number", fmt(st.M, 3)],
      ["Velocity", `${fmt(st.V, 1)} m/s`],
      ["Density", `${fmt(st.rho, 3)} kg/m³`],
      ["Static enthalpy", `${fmt(st.h / 1000, 1)} kJ/kg`],
      ["Stagnation enthalpy", `${fmt(st.h0 / 1000, 1)} kJ/kg`],
    ],
  };
}

/** The actual diagram — rendered once inline, and again (with its own ids and its own click state) inside the expanded overlay. */
function Diagram({ config, result, idSuffix }) {
  const { stations, compressor, turbine } = result;
  const [selected, setSelected] = useState(null);

  const isAxialCompressor = config.compressor_type === "axial";
  const isAxialTurbine = config.turbine_type === "axial";
  const isConvDi = config.nozzle_type === "conv-di";

  const compressorMid = (SECTION.compressor.x0 + SECTION.compressor.x1) / 2;
  const turbineMid = (SECTION.turbine.x0 + SECTION.turbine.x1) / 2;
  const nozzleMid = (SECTION.nozzle.x0 + SECTION.nozzle.x1) / 2;

  const tValues = STATIONS.map((s) => stations[s.key].T0);
  const tMin = Math.min(...tValues);
  const tMax = Math.max(...tValues);
  const gradientStops = STATIONS.map((s) => {
    const offset = ((s.x - FLOW_X0) / (FLOW_X1 - FLOW_X0)) * 100;
    const color = stationHeatColor(stations[s.key].T0, tMin, tMax);
    return <stop key={s.key} offset={`${offset}%`} stopColor={color} />;
  });

  function selectPart(kind, xMid) {
    const details = partDetails(kind, result, config);
    if (!details) return;
    setSelected({ details, leftPct: ((xMid + MARGIN) / TOTAL_W) * 100 });
  }

  function selectStation(s) {
    setSelected({
      details: stationDetails(s.key, s.name, stations[s.key]),
      leftPct: ((s.x + MARGIN) / TOTAL_W) * 100,
    });
  }

  function handleWrapperClick(e) {
    if (!selected) return;
    if (
      e.target.closest(".ed-part-card") ||
      e.target.closest(".ed-clickable") ||
      e.target.closest(".station-readout")
    ) {
      return;
    }
    setSelected(null);
  }

  return (
    <div className="engine-diagram-scroll" onClick={handleWrapperClick}>
      <svg
        viewBox={`${-MARGIN} 0 ${TOTAL_W} ${VBOX_H}`}
        className="engine-diagram-svg"
        role="img"
        aria-label="Half-cutaway schematic of the configured engine, showing the internal flow path from intake to nozzle. Click any part for its values."
      >
        <defs>
          <linearGradient
            id={`ed-heat-flow-${idSuffix}`}
            gradientUnits="userSpaceOnUse"
            x1={FLOW_X0}
            y1={FLOW_Y}
            x2={FLOW_X1}
            y2={FLOW_Y}
          >
            {gradientStops}
          </linearGradient>
          <linearGradient id={`ed-metal-casing-${idSuffix}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbfcfe" />
            <stop offset="42%" stopColor="#e6e9f2" />
            <stop offset="55%" stopColor="#ced2e2" />
            <stop offset="100%" stopColor="#eef0f7" />
          </linearGradient>
          <clipPath id={`ed-lower-half-${idSuffix}`}>
            <rect x={-800} y={CENTERLINE_Y} width="2000" height="400" />
          </clipPath>
        </defs>

        {/* Solid upper-half casing — the "closed" side of the cutaway */}
        <path d={CASING_PATH} className="ed-casing" fill={`url(#ed-metal-casing-${idSuffix})`} />
        {CASING_RIVETS.map(([x, dy], i) => (
          <circle key={i} cx={x} cy={CENTERLINE_Y + dy * 0.6} r="1.7" className="ed-rivet" />
        ))}

        {/* Axis-of-symmetry centerline (dash-dot, the standard cutaway convention) */}
        <line x1="4" y1={CENTERLINE_Y} x2="900" y2={CENTERLINE_Y} className="ed-axis" />

        {/* Internal components — exposed in the "opened" lower half only */}
        <g clipPath={`url(#ed-lower-half-${idSuffix})`}>
          <Clickable onSelect={() => selectPart("intake", (SECTION.intake.x0 + SECTION.intake.x1) / 2)} label="Intake — click for values">
            <rect
              x={SECTION.intake.x0}
              y={CENTERLINE_Y - 40}
              width={SECTION.intake.x1 - SECTION.intake.x0}
              height="80"
              fill="transparent"
            />
            <polygon
              points={`${SECTION.intake.x0},${CENTERLINE_Y - 34} ${SECTION.intake.x1},${CENTERLINE_Y - 20} ${SECTION.intake.x1},${CENTERLINE_Y + 20} ${SECTION.intake.x0},${CENTERLINE_Y + 34}`}
              className="ed-intake"
            />
          </Clickable>

          <Clickable onSelect={() => selectPart("compressor", compressorMid)} label="Compressor — click for values">
            <rect
              x={SECTION.compressor.x0}
              y={CENTERLINE_Y - 56}
              width={SECTION.compressor.x1 - SECTION.compressor.x0}
              height="112"
              fill="transparent"
            />
            {isAxialCompressor ? (
              <>
                <StageBars
                  x0={SECTION.compressor.x0}
                  x1={SECTION.compressor.x1}
                  count={config.n_compressor_stages}
                  growUp
                  className="ed-compressor"
                />
                <FanBlades cx={compressorMid} cy={CENTERLINE_Y} r={22} className="ed-fan-compressor" dur="2s" />
              </>
            ) : (
              <RadialWheel cx={compressorMid} cy={CENTERLINE_Y} r={44} className="ed-compressor" dur="2.4s" />
            )}
          </Clickable>

          <Clickable onSelect={() => selectPart("combustor", (SECTION.combustor.x0 + SECTION.combustor.x1) / 2)} label="Combustor — click for values">
            <rect
              x={SECTION.combustor.x0}
              y={CENTERLINE_Y - 56}
              width={SECTION.combustor.x1 - SECTION.combustor.x0}
              height="112"
              fill="transparent"
            />
            <rect
              x={SECTION.combustor.x0}
              y={CENTERLINE_Y - 46}
              width={SECTION.combustor.x1 - SECTION.combustor.x0}
              height="92"
              rx="14"
              className="ed-combustor"
            />
            <path
              d={`M ${SECTION.combustor.x0 + 18} ${CENTERLINE_Y + 18}
                  q 9 -30 18 0 q 9 -42 18 0 q 9 -30 18 0 q 9 -20 17 0`}
              className="ed-flame"
            />
          </Clickable>

          <Clickable onSelect={() => selectPart("turbine", turbineMid)} label="Turbine — click for values">
            <rect
              x={SECTION.turbine.x0}
              y={CENTERLINE_Y - 56}
              width={SECTION.turbine.x1 - SECTION.turbine.x0}
              height="112"
              fill="transparent"
            />
            {isAxialTurbine ? (
              <>
                <StageBars
                  x0={SECTION.turbine.x0}
                  x1={SECTION.turbine.x1}
                  count={config.n_turbine_stages}
                  growUp={false}
                  className="ed-turbine"
                />
                <FanBlades cx={turbineMid} cy={CENTERLINE_Y} r={20} className="ed-fan-turbine" dur="1.5s" />
              </>
            ) : (
              <RadialWheel cx={turbineMid} cy={CENTERLINE_Y} r={40} className="ed-turbine" dur="1.3s" />
            )}
          </Clickable>

          <Clickable onSelect={() => selectPart("nozzle", nozzleMid)} label="Nozzle — click for values">
            <rect
              x={SECTION.nozzle.x0}
              y={CENTERLINE_Y - 40}
              width={SECTION.nozzle.x1 - SECTION.nozzle.x0}
              height="80"
              fill="transparent"
            />
            {isConvDi ? (
              <polygon
                points={`${SECTION.nozzle.x0},${CENTERLINE_Y - 30} ${nozzleMid},${CENTERLINE_Y - 7} ${SECTION.nozzle.x1},${CENTERLINE_Y - 20} ${SECTION.nozzle.x1},${CENTERLINE_Y + 20} ${nozzleMid},${CENTERLINE_Y + 7} ${SECTION.nozzle.x0},${CENTERLINE_Y + 30}`}
                className="ed-nozzle"
              />
            ) : (
              <polygon
                points={`${SECTION.nozzle.x0},${CENTERLINE_Y - 30} ${SECTION.nozzle.x1},${CENTERLINE_Y - 12} ${SECTION.nozzle.x1},${CENTERLINE_Y + 12} ${SECTION.nozzle.x0},${CENTERLINE_Y + 30}`}
                className="ed-nozzle"
              />
            )}
          </Clickable>

          {/* Heat-mapped flow — several thin streamlines, not one thick pipe */}
          {FLOW_LANE_OFFSETS.map((dy, i) => (
            <line
              key={i}
              x1={FLOW_X0}
              y1={FLOW_Y + dy}
              x2={FLOW_X1}
              y2={FLOW_Y + dy}
              className="ed-flow-lane"
              stroke={`url(#ed-heat-flow-${idSuffix})`}
              opacity={i === 1 || i === 2 ? 0.65 : 0.35}
            />
          ))}
          {FLOW_LANE_OFFSETS.flatMap((dy, laneIdx) =>
            Array.from({ length: STREAKS_PER_LANE }, (_, j) => (
              <FlowStreak
                key={`${laneIdx}-${j}`}
                y={FLOW_Y + dy}
                index={laneIdx * STREAKS_PER_LANE + j}
                count={FLOW_LANE_OFFSETS.length * STREAKS_PER_LANE}
              />
            ))
          )}
        </g>

        {STATIONS.map((s) => (
          <line
            key={s.key}
            x1={s.x}
            y1={CENTERLINE_Y - 58}
            x2={s.x}
            y2={CENTERLINE_Y + 58}
            className="ed-guide"
          />
        ))}
      </svg>

      <div className="station-readouts">
        {STATIONS.map((s) => (
          <StationReadout
            key={s.key}
            station={s.key}
            name={s.name}
            T0={stations[s.key].T0}
            p0={stations[s.key].p0}
            leftPct={((s.x + MARGIN) / TOTAL_W) * 100}
            onSelect={() => selectStation(s)}
          />
        ))}
      </div>

      <PartCard details={selected?.details} leftPct={selected?.leftPct ?? 50} onClose={() => setSelected(null)} />

      <p className="section-note">
        A live half-cutaway — click any part, or a station marker, to see
        its numbers spelled out in plain English. Flow runs left to right:
        near-white and cool at the intake, warming to red through the
        compressor and combustor, cooling back down through the turbine
        and nozzle. Compressor: {compressor.type}. Turbine: {turbine.type}.
      </p>
    </div>
  );
}

export default function EngineDiagram({ config, result }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return undefined;
    function onKeyDown(e) {
      if (e.key === "Escape") setExpanded(false);
    }
    window.addEventListener("keydown", onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [expanded]);

  if (!result) return null;

  return (
    <>
      <div className="engine-diagram">
        <div className="engine-diagram-toolbar">
          <span className="engine-diagram-title">Live engine cutaway</span>
          <button type="button" className="ed-expand-button" onClick={() => setExpanded(true)}>
            ⤢ Expand
          </button>
        </div>
        <Diagram config={config} result={result} idSuffix="inline" />
      </div>

      {expanded && (
        <div
          className="ed-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setExpanded(false);
          }}
        >
          <div className="ed-modal-content">
            <button
              type="button"
              className="ed-modal-close"
              onClick={() => setExpanded(false)}
              aria-label="Close expanded diagram"
            >
              ×
            </button>
            <div className="engine-diagram-toolbar">
              <span className="engine-diagram-title">Live engine cutaway</span>
            </div>
            <div className="engine-diagram-scroll-big">
              <Diagram config={config} result={result} idSuffix="modal" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

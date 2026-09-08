import { useAnimatedNumber } from "../hooks/useAnimatedNumber.js";
import { fmt } from "../utils/format.js";

/**
 * A live schematic of the engine being configured: intake, compressor,
 * combustor, turbine, and nozzle, redrawn to reflect the current
 * architecture choices (axial vs. centrifugal compressor, axial vs.
 * radial turbine, convergent vs. convergent-divergent nozzle), with the
 * solved station values (T0, p0) animating in place as the config
 * changes. Purely illustrative — every number shown is read directly
 * from `result.stations` (see physics/engine.js); nothing here feeds
 * back into the solver.
 */

const VBOX_W = 920;
const VBOX_H = 200;
const CENTERLINE_Y = 100;
// Extra dead space reserved on each side of the viewBox purely so a
// station readout centered (via translateX(-50%)) on a near-edge station
// (e.g. freestream, right at the left edge) has room to render without
// its label clipping against the scroll container's edge.
const MARGIN = 60;
const TOTAL_W = VBOX_W + MARGIN * 2;

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

/** A simple radial-wheel glyph for centrifugal compressors / radial turbines. */
function RadialWheel({ cx, cy, r, className }) {
  const spokes = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    spokes.push(
      <line
        key={i}
        x1={cx}
        y1={cy}
        x2={cx + Math.cos(a) * (r - 6)}
        y2={cy + Math.sin(a) * (r - 6)}
        className="ed-spoke"
      />
    );
  }
  return (
    <>
      <circle cx={cx} cy={cy} r={r} className={className} />
      {spokes}
      <circle cx={cx} cy={cy} r={r * 0.22} className="ed-hub" />
    </>
  );
}

function StationReadout({ station, name, T0, p0, leftPct }) {
  const animT = useAnimatedNumber(T0);
  const animP = useAnimatedNumber(p0 / 1000);
  return (
    <div className="station-readout" style={{ left: `${leftPct}%` }}>
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

export default function EngineDiagram({ config, result }) {
  if (!result) return null;
  const { stations } = result;

  const isAxialCompressor = config.compressor_type === "axial";
  const isAxialTurbine = config.turbine_type === "axial";
  const isConvDi = config.nozzle_type === "conv-di";

  const compressorMid = (SECTION.compressor.x0 + SECTION.compressor.x1) / 2;
  const turbineMid = (SECTION.turbine.x0 + SECTION.turbine.x1) / 2;
  const nozzleMid = (SECTION.nozzle.x0 + SECTION.nozzle.x1) / 2;

  return (
    <div className="engine-diagram">
      <div className="engine-diagram-scroll">
        <svg
          viewBox={`${-MARGIN} 0 ${TOTAL_W} ${VBOX_H}`}
          className="engine-diagram-svg"
          role="img"
          aria-label="Schematic of the configured engine, intake to nozzle"
        >
          <line x1="8" y1={CENTERLINE_Y} x2="900" y2={CENTERLINE_Y} className="ed-centerline" />

          {/* Intake */}
          <polygon
            points={`${SECTION.intake.x0},${CENTERLINE_Y - 34} ${SECTION.intake.x1},${CENTERLINE_Y - 20} ${SECTION.intake.x1},${CENTERLINE_Y + 20} ${SECTION.intake.x0},${CENTERLINE_Y + 34}`}
            className="ed-intake"
          />

          {/* Compressor */}
          {isAxialCompressor ? (
            <StageBars
              x0={SECTION.compressor.x0}
              x1={SECTION.compressor.x1}
              count={config.n_compressor_stages}
              growUp
              className="ed-compressor"
            />
          ) : (
            <RadialWheel cx={compressorMid} cy={CENTERLINE_Y} r={44} className="ed-compressor" />
          )}

          {/* Combustor */}
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

          {/* Turbine */}
          {isAxialTurbine ? (
            <StageBars
              x0={SECTION.turbine.x0}
              x1={SECTION.turbine.x1}
              count={config.n_turbine_stages}
              growUp={false}
              className="ed-turbine"
            />
          ) : (
            <RadialWheel cx={turbineMid} cy={CENTERLINE_Y} r={40} className="ed-turbine" />
          )}

          {/* Nozzle */}
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
            />
          ))}
        </div>
      </div>
      <p className="section-note">
        Live schematic — redraws to match your compressor, turbine, and
        nozzle choices. Station letters/numbers match the station-analysis
        table below (Ref: §11).
      </p>
    </div>
  );
}

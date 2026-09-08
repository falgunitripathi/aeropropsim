import PerformanceSummary from "./PerformanceSummary.jsx";
import StationTable from "./StationTable.jsx";
import StageTable from "./StageTable.jsx";
import TsDiagram from "./TsDiagram.jsx";
import EngineDiagram from "./EngineDiagram.jsx";
import Glossary from "./Glossary.jsx";
import { useScrollReveal } from "../hooks/useScrollReveal.js";
import { fmt } from "../utils/format.js";

const STATION_TERMS = [
  { symbol: "T0", meaning: "Stagnation (total) temperature — what a thermometer would read if the flow were brought to rest here." },
  { symbol: "p0", meaning: "Stagnation (total) pressure — same idea, for pressure." },
  { symbol: "T", meaning: "Static temperature — the actual temperature of the moving air." },
  { symbol: "p", meaning: "Static pressure — the actual pressure of the moving air." },
  { symbol: "M", meaning: "Mach number — flow speed divided by the local speed of sound." },
  { symbol: "V", meaning: "Flow velocity." },
  { symbol: "ρ", meaning: "Density." },
  { symbol: "h", meaning: "Static specific enthalpy." },
  { symbol: "h0", meaning: "Stagnation specific enthalpy." },
];

const STAGE_TERMS = [
  { symbol: "T0 in / T0 out", meaning: "Stagnation temperature entering / leaving this one stage." },
  { symbol: "ΔT0", meaning: "The temperature rise (compressor) or drop (turbine) this stage adds." },
  { symbol: "Stage π", meaning: "This stage's own pressure ratio (compressor)." },
  { symbol: "Expansion ratio", meaning: "This stage's own pressure ratio (turbine), quoted ≥ 1." },
  { symbol: "p0 in/out (rel.)", meaning: "Stagnation pressure relative to the very first stage inlet — a running check on cumulative loss." },
];

/**
 * The full results view for one solved EngineResult: overall performance
 * summary, the live engine diagram, the station-analysis table, per-stage
 * compressor/turbine tables, and a T-s process diagram. `config` is passed
 * through only so the engine diagram and the compressor note can read the
 * architecture choices (axial/centrifugal, blade tip speed) alongside the
 * solved numbers.
 */
export default function ResultsPanel({ result, config }) {
  const { performance, nozzle, compressor, turbine, stations } = result;
  const [tsRef, tsVisible] = useScrollReveal();

  return (
    <div className="results-panel">
      <section>
        <h2>Overall performance</h2>
        <PerformanceSummary performance={performance} nozzle={nozzle} />
      </section>

      <EngineDiagram config={config} result={result} />

      <section>
        <h2>Station analysis</h2>
        <StationTable stations={stations} />
        <Glossary terms={STATION_TERMS} />
      </section>

      <div className="stage-tables-row">
        <section>
          <h2>Compressor stages ({compressor.type})</h2>
          <StageTable stages={compressor.stages} kind="compressor" />
          <p className="section-note">
            Overall π_c achieved: {fmt(compressor.pi_actual, 3)}
          </p>
          {compressor.type === "centrifugal" && (
            <p className="section-note">
              In calculation form: you set blade tip speed U2 ={" "}
              {fmt(config.centrifugal_U2, 0)} m/s, and π_c is derived from it
              via π_c = [1 + η_c·(γ_c−1)·(U2/a01)²]^(γ_c/(γ_c−1)) — the
              pressure ratio is a result here, not something you dial in
              directly (§4.3).
            </p>
          )}
          <Glossary terms={STAGE_TERMS} />
        </section>

        <section>
          <h2>Turbine stages ({turbine.type})</h2>
          <StageTable stages={turbine.stages} kind="turbine" />
          <p className="section-note">
            Overall expansion ratio achieved: {fmt(1.0 / turbine.pr_actual, 3)}
          </p>
          {turbine.type === "radial" && (
            <p className="section-note">
              In calculation form: spouting velocity V0 ={" "}
              {fmt(turbine.V0_spouting, 1)} m/s (from the cycle's own T04 and
              T05), then blade tip speed U2 = 0.707 × V0 ={" "}
              {fmt(turbine.U2_sized, 1)} m/s. Both are calculated outputs
              here — you don't set them directly (§6.2).
            </p>
          )}
        </section>
      </div>

      <section ref={tsRef} className={`reveal-on-scroll${tsVisible ? " is-visible" : ""}`}>
        <h2>T-s process diagram</h2>
        <TsDiagram stations={stations} />
        <p className="section-note">
          Approximate — see <code>TsDiagram.jsx</code> for the entropy-datum
          caveat across the combustor.
        </p>
      </section>
    </div>
  );
}

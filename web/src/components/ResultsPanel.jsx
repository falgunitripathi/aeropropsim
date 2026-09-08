import PerformanceSummary from "./PerformanceSummary.jsx";
import StationTable from "./StationTable.jsx";
import StageTable from "./StageTable.jsx";
import TsDiagram from "./TsDiagram.jsx";
import { useScrollReveal } from "../hooks/useScrollReveal.js";

/**
 * The full results view for one solved EngineResult: overall performance
 * summary, per-stage compressor/turbine tables, the station-analysis
 * table, and a T-s process diagram.
 */
export default function ResultsPanel({ result }) {
  const { performance, nozzle, compressor, turbine, stations } = result;
  const [tsRef, tsVisible] = useScrollReveal();

  return (
    <div className="results-panel">
      <section>
        <h2>Overall performance</h2>
        <PerformanceSummary performance={performance} nozzle={nozzle} />
      </section>

      <section>
        <h2>Station analysis</h2>
        <StationTable stations={stations} />
      </section>

      <div className="stage-tables-row">
        <section>
          <h2>Compressor stages ({compressor.type})</h2>
          <StageTable stages={compressor.stages} kind="compressor" />
          <p className="section-note">
            Overall π_c achieved: {compressor.pi_actual.toFixed(3)}
          </p>
        </section>

        <section>
          <h2>Turbine stages ({turbine.type})</h2>
          <StageTable stages={turbine.stages} kind="turbine" />
          <p className="section-note">
            Overall expansion ratio achieved: {(1.0 / turbine.pr_actual).toFixed(3)}
          </p>
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

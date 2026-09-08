import { useMemo, useState } from "react";
import { defaultEngineConfig, solveEngine } from "./physics/engine.js";
import ConfigForm from "./components/ConfigForm.jsx";
import ResultsPanel from "./components/ResultsPanel.jsx";
import "./App.css";

/**
 * AeroPropSim — a single-spool turbojet performance simulator.
 *
 * All physics runs client-side, ported module-by-module from the
 * validated Python engineering core (see src/physics/*.js and the
 * top-level README) — this is a static site with no backend by design,
 * so it always works when someone clicks the link.
 */
function App() {
  const [config, setConfig] = useState(defaultEngineConfig());

  const patchConfig = (patch) => setConfig((prev) => ({ ...prev, ...patch }));
  const resetConfig = () => setConfig(defaultEngineConfig());

  const { result, error } = useMemo(() => {
    try {
      return { result: solveEngine(config), error: null };
    } catch (err) {
      return { result: null, error: err.message || String(err) };
    }
  }, [config]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>AeroPropSim</h1>
        <p className="app-subtitle">
          An interactive single-spool turbojet performance simulator — every
          number below is solved live, in your browser, from the same
          validated cycle equations as the project's Python engineering core.
        </p>
      </header>

      <main className="app-main">
        <ConfigForm config={config} onChange={patchConfig} onReset={resetConfig} />

        <div className="results-area">
          {error ? (
            <div className="error-banner">
              <strong>This configuration isn't physically solvable:</strong>
              <p>{error}</p>
              <p className="section-note">
                Adjust an input on the left — most often this means the
                turbine inlet temperature is too low (or too close to the
                compressor exit temperature) for the chosen pressure ratio
                and efficiencies.
              </p>
            </div>
          ) : (
            <ResultsPanel result={result} />
          )}
        </div>
      </main>

      <footer className="app-footer">
        <p>
          Formulas cited section-by-section (Ref: §N) back to the project's
          compiled formula reference. See the repository README for
          validation status, known simplifications, and the two
          documented judgment calls (intake convention, choked-nozzle
          exit-temperature convention).
        </p>
      </footer>
    </div>
  );
}

export default App;

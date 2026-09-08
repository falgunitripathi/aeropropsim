import { useMemo, useState } from "react";
import { defaultEngineConfig, solveEngine } from "./physics/engine.js";
import ConfigForm from "./components/ConfigForm.jsx";
import EngineDiagram from "./components/EngineDiagram.jsx";
import ResultsPanel from "./components/ResultsPanel.jsx";
import "./App.css";

/**
 * PropCalc — a single-spool turbojet performance simulator.
 *
 * All physics runs client-side, ported module-by-module from the
 * validated Python engineering core (see src/physics/*.js and the
 * top-level README) — this is a static site with no backend by design,
 * so it always works when someone clicks the link. (The Python package
 * underneath is still called `aeropropsim` — that's internal plumbing,
 * not the project's name.)
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
        <h1>PropCalc</h1>
        <p className="app-subtitle">
          Build a jet engine, one number at a time. Change anything on the
          left — altitude, pressure ratio, turbine type — and watch the
          whole engine cycle re-solve instantly, right here in your browser.
        </p>
      </header>

      <main className="app-main">
        <ConfigForm config={config} onChange={patchConfig} onReset={resetConfig} />

        <div className="results-area">
          {error ? (
            <div className="error-banner">
              <span className="error-icon" aria-hidden="true">
                🚫
              </span>
              <div>
                <strong>Not possible</strong>
                <p>
                  This combination doesn&rsquo;t work as a real engine. Try
                  adjusting one of the numbers on the left — a small change
                  is usually all it takes.
                </p>
              </div>
            </div>
          ) : (
            <>
              <EngineDiagram config={config} result={result} />
              <ResultsPanel result={result} />
            </>
          )}
        </div>
      </main>

      <footer className="app-footer">
        <p>
          Formulas cited section-by-section (Ref: §N) back to the project&rsquo;s
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

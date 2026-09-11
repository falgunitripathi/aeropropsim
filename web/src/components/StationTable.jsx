import { fmt, fmtKPa } from "../utils/format.js";

const STATION_ORDER = ["a", "2", "3", "4", "5", "9"];
const STATION_LABELS = {
  a: "a — freestream",
  "2": "2 — compressor inlet",
  "3": "3 — compressor exit",
  "4": "4 — combustor exit (TIT)",
  "5": "5 — turbine exit",
  "9": "9 — nozzle exit",
};

/**
 * Station Analysis table — every key station's full (T0, p0, T, p, M, V,
 * rho, h, h0) row, from `EngineResult.stations` (Ref §2.1 station-state
 * recipe, §11 solve order for which stations are tabulated).
 *
 * Station 9's p0 will read lower than station 5's p0 — that's the
 * nozzle's real total-pressure loss made visible (see
 * `Station.fromStatic`'s docstring in gasstate.js); its T0 should equal
 * station 5's T0 (adiabatic nozzle) as a running self-consistency check.
 *
 * The leading "Step" column numbers these 1-6 in simple flow order, since
 * the traditional station numbers themselves (a, 2, 3, 4, 5, 9) jump from
 * 5 to 9 — that's the standard gas-turbine convention (stations 6-8 are
 * reserved for an afterburner/reheat section this model doesn't include),
 * not a typo, but it reads oddly without a plain sequence alongside it.
 */
export default function StationTable({ stations }) {
  return (
    <div className="table-scroll">
      <table className="station-table">
        <thead>
          <tr>
            <th>Step</th>
            <th>Station</th>
            <th>T0 (K)</th>
            <th>p0 (kPa)</th>
            <th>T (K)</th>
            <th>p (kPa)</th>
            <th>M</th>
            <th>V (m/s)</th>
            <th>ρ (kg/m³)</th>
            <th>h (kJ/kg)</th>
            <th>h0 (kJ/kg)</th>
          </tr>
        </thead>
        <tbody>
          {STATION_ORDER.map((key, i) => {
            const st = stations[key];
            if (!st) return null;
            return (
              <tr key={key}>
                <td>{i + 1}</td>
                <td className="station-name">{STATION_LABELS[key] || key}</td>
                <td>{fmt(st.T0, 1)}</td>
                <td>{fmtKPa(st.p0, 1)}</td>
                <td>{fmt(st.T, 1)}</td>
                <td>{fmtKPa(st.p, 1)}</td>
                <td>{fmt(st.M, 3)}</td>
                <td>{fmt(st.V, 1)}</td>
                <td>{fmt(st.rho, 3)}</td>
                <td>{fmt(st.h / 1000.0, 1)}</td>
                <td>{fmt(st.h0 / 1000.0, 1)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

import { fmt } from "../utils/format.js";

/**
 * Per-stage table shared by the compressor and turbine stage-stacks
 * (Ref §4.2 compressor stacking, §6.1 turbine stacking). `kind` selects
 * whether the ratio column reads as a pressure-ratio rise (compressor,
 * pi_stage >= 1) or an expansion ratio (turbine, pr_stage <= 1, shown
 * inverted as "expansion ratio" >= 1 to match how it's conventionally
 * quoted).
 *
 * A single-stage radial turbine's synthetic stage entry (built directly
 * in engine.js, not by stackAxialTurbine) omits the relative-pressure
 * bookkeeping fields — rendered as "—" rather than crashing.
 */
export default function StageTable({ stages, kind }) {
  const isCompressor = kind === "compressor";
  const ratioKey = isCompressor ? "pi_stage" : "pr_stage";
  const inRelKey = isCompressor ? "p01_in_rel" : "p_in_rel";
  const outRelKey = isCompressor ? "p01_out_rel" : "p_out_rel";

  return (
    <div className="table-scroll">
      <table className="stage-table">
        <thead>
          <tr>
            <th>Stage</th>
            <th>T0 in (K)</th>
            <th>T0 out (K)</th>
            <th>ΔT0 (K)</th>
            <th>{isCompressor ? "Stage π" : "Expansion ratio"}</th>
            <th>p0 in (rel.)</th>
            <th>p0 out (rel.)</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((stage, i) => {
            const ratio = stage[ratioKey];
            const displayRatio = isCompressor ? ratio : (ratio ? 1.0 / ratio : null);
            return (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>{fmt(stage.T01_in, 1)}</td>
                <td>{fmt(stage.T01_out, 1)}</td>
                <td>{fmt(stage.dT0, 1)}</td>
                <td>{fmt(displayRatio, 3)}</td>
                <td>{stage[inRelKey] !== undefined ? fmt(stage[inRelKey], 3) : "—"}</td>
                <td>{stage[outRelKey] !== undefined ? fmt(stage[outRelKey], 3) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

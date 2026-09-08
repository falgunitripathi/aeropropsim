/**
 * A tucked-away plain-English legend for technical column headers like
 * T0, p0, ΔT0 — collapsed by default so it never clutters the table for
 * someone who already knows the notation, but one click away for anyone
 * who doesn't. Native <details>/<summary>, so it needs no extra state.
 */
export default function Glossary({ terms }) {
  return (
    <details className="glossary">
      <summary>What do these mean?</summary>
      <div className="glossary-list">
        {terms.map(({ symbol, meaning }) => (
          <div className="glossary-row" key={symbol}>
            <dt>{symbol}</dt>
            <dd>{meaning}</dd>
          </div>
        ))}
      </div>
    </details>
  );
}


/**
 * The patterns that the numbers of a period show.
 *
 * @param {{ patterns: any[] }} props
 */
export default function InsightCards({ patterns }) {
  if (!patterns || patterns.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-glyph" aria-hidden="true">
          ✧
        </div>
        <h3>No patterns to report</h3>
        <p>Record a few more readings and the app will point out what stands out.</p>
      </div>
    );
  }

  return (
    <div className="insight-grid">
      {patterns.map((pattern) => (
        <article className={`insight insight-${pattern.severity}`} key={pattern.id}>
          <span className="insight-icon" aria-hidden="true">
            {pattern.severity === 'success' ? '✓' : pattern.severity === 'warning' ? '!' : 'i'}
          </span>
          <div>
            <h3>{pattern.title}</h3>
            <p>{pattern.detail}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

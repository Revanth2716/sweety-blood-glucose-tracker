/**
 * Shows how a number changed compared with the previous period.
 *
 * @param {{
 *   trend: { direction: string | null, changePercent: number | null, higherIsBetter?: string | null } | null,
 *   note?: string
 * }} props
 */
export default function TrendBadge({ trend, note }) {
  if (!trend || !trend.direction) {
    return <span className="trend">No comparison yet</span>;
  }

  const arrow = trend.direction === 'up' ? '▲' : trend.direction === 'down' ? '▼' : '▬';
  const neutral = !trend.higherIsBetter;
  const className = neutral
    ? `trend neutral-direction ${trend.direction}`
    : `trend ${trend.direction}`;
  const change = trend.changePercent ?? 0;

  return (
    <span className={className}>
      <span aria-hidden="true">{arrow}</span>
      <span>
        {change > 0 ? '+' : ''}
        {change}%
      </span>
      {note ? <span className="trend-note">{note}</span> : null}
    </span>
  );
}

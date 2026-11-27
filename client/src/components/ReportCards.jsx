import AnimatedNumber from './AnimatedNumber.jsx';
import TrendBadge from './TrendBadge.jsx';

/**
 * The numbers of a report, with the change against the previous period.
 *
 * @param {{
 *   stats: any,
 *   trend?: any,
 *   previousLabel?: string
 * }} props
 */
export default function ReportCards({ stats, trend, previousLabel = 'vs previous period' }) {
  const cards = [
    {
      key: 'highest',
      label: 'Highest',
      value: stats.highest,
      decimals: 0,
      unit: 'mg/dl',
      trend: null,
    },
    {
      key: 'lowest',
      label: 'Lowest',
      value: stats.lowest,
      decimals: 0,
      unit: 'mg/dl',
      trend: null,
    },
    {
      key: 'average',
      label: 'Average',
      value: stats.average,
      decimals: 1,
      unit: 'mg/dl',
      trend: trend?.average ?? null,
    },
    {
      key: 'count',
      label: 'Readings',
      value: stats.count,
      decimals: 0,
      unit: '',
      trend: trend?.count ?? null,
    },
    {
      key: 'timeInRange',
      label: 'Time in range',
      value: stats.timeInRange,
      decimals: 1,
      unit: '%',
      trend: trend?.timeInRange ?? null,
    },
  ];

  if (stats.estimatedA1c !== null && stats.estimatedA1c !== undefined) {
    cards.push({
      key: 'a1c',
      label: 'Estimated A1C',
      value: stats.estimatedA1c,
      decimals: 1,
      unit: '%',
      trend: null,
    });
  }

  return (
    <div className="stat-grid">
      {cards.map((card) => (
        <div className="stat-card" key={card.key}>
          <span className="stat-label">{card.label}</span>
          <span className="stat-value">
            <AnimatedNumber value={card.value} decimals={card.decimals} />
            {card.value !== null && card.value !== undefined && card.unit ? (
              <small>{card.unit}</small>
            ) : null}
          </span>
          <span className="stat-foot">
            {card.trend ? <TrendBadge trend={card.trend} note={previousLabel} /> : null}
          </span>
        </div>
      ))}
    </div>
  );
}

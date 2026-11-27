/**
 * The four numbers of a report: highest, lowest, average and the number of readings.
 *
 * @param {{ highest: number | null, lowest: number | null, average: number | null, count: number }} stats
 */
export default function ReportCards({ stats }) {
  const cards = [
    { label: 'Highest', value: stats.highest, unit: 'mg/dl' },
    { label: 'Lowest', value: stats.lowest, unit: 'mg/dl' },
    { label: 'Average', value: stats.average, unit: 'mg/dl' },
    { label: 'Readings', value: stats.count, unit: '' },
  ];

  return (
    <div className="stat-grid">
      {cards.map((card) => (
        <div className="stat-card" key={card.label}>
          <span className="stat-label">{card.label}</span>
          <span className="stat-value">
            {card.value === null ? '–' : card.value}
            {card.value !== null && card.unit ? <small>{card.unit}</small> : null}
          </span>
        </div>
      ))}
    </div>
  );
}

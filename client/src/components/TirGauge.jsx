import AnimatedNumber from './AnimatedNumber.jsx';

const RADIUS = 68;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * The colour of the ring, following the usual goal of more than 70 percent.
 *
 * @param {number | null} percent
 * @returns {string}
 */
function colourFor(percent) {
  if (percent === null || percent === undefined) {
    return 'var(--muted)';
  }
  if (percent >= 70) {
    return 'var(--ok)';
  }
  if (percent >= 50) {
    return 'var(--warn)';
  }
  return 'var(--danger)';
}

/**
 * A round gauge for a percentage.
 *
 * It is used for the time in range of a period and for the adherence of a patient.
 *
 * @param {{
 *   percent: number | null,
 *   caption?: string,
 *   legend?: { label: string, value: number | string, colour?: string }[],
 *   showLegend?: boolean,
 *   suffix?: string
 * }} props
 */
export default function TirGauge({
  percent,
  caption = 'Time in range',
  legend = [],
  showLegend = true,
  suffix = '%',
}) {
  const safePercent = percent ?? 0;
  const offset = CIRCUMFERENCE * (1 - safePercent / 100);
  const colour = colourFor(percent);

  return (
    <div className="gauge">
      <div className="gauge-ring">
        <svg width="168" height="168" viewBox="0 0 168 168" aria-hidden="true">
          <defs>
            <linearGradient id="gauge-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={colour} stopOpacity="0.55" />
              <stop offset="100%" stopColor={colour} />
            </linearGradient>
          </defs>
          <circle className="gauge-track" cx="84" cy="84" r={RADIUS} fill="none" strokeWidth="13" />
          <circle
            className="gauge-value"
            cx="84"
            cy="84"
            r={RADIUS}
            fill="none"
            stroke="url(#gauge-gradient)"
            strokeWidth="13"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
        </svg>

        <div className="gauge-center">
          <span className="gauge-number" style={{ color: colour }}>
            <AnimatedNumber value={percent} decimals={1} suffix={suffix} />
          </span>
          <span className="gauge-caption">{caption}</span>
        </div>
      </div>

      {showLegend && legend.length > 0 ? (
        <div className="gauge-legend">
          {legend.map((entry) => (
            <div className="legend-row" key={entry.label}>
              <span
                className="legend-dot"
                style={{ background: entry.colour ?? 'var(--border-strong)' }}
              />
              <span>{entry.label}</span>
              <span className="legend-value">{entry.value}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

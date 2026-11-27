import AnimatedNumber from './AnimatedNumber.jsx';

const RADIUS = 68;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * The colour of the ring, following the usual goal of more than 70 percent in range.
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
 * The time in range of a period: how much of it was spent between 70 and 180 mg/dl.
 *
 * @param {{
 *   percent: number | null,
 *   inRange?: number,
 *   belowRange?: number,
 *   aboveRange?: number,
 *   total?: number
 * }} props
 */
export default function TirGauge({
  percent,
  inRange = 0,
  belowRange = 0,
  aboveRange = 0,
  total = 0,
}) {
  const safePercent = percent ?? 0;
  const offset = CIRCUMFERENCE * (1 - safePercent / 100);
  const colour = colourFor(percent);

  return (
    <div className="gauge">
      <div className="gauge-ring">
        <svg width="168" height="168" viewBox="0 0 168 168" aria-hidden="true">
          <defs>
            <linearGradient id="tir-gradient" x1="0" y1="0" x2="1" y2="1">
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
            stroke="url(#tir-gradient)"
            strokeWidth="13"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
        </svg>

        <div className="gauge-center">
          <span className="gauge-number" style={{ color: colour }}>
            <AnimatedNumber value={percent} decimals={1} suffix="%" />
          </span>
          <span className="gauge-caption">Time in range</span>
        </div>
      </div>

      <div className="gauge-legend">
        <div className="legend-row">
          <span className="legend-dot" style={{ background: 'var(--ok)' }} />
          <span>In range (70-180)</span>
          <span className="legend-value">{inRange}</span>
        </div>
        <div className="legend-row">
          <span className="legend-dot" style={{ background: 'var(--danger)' }} />
          <span>Below range</span>
          <span className="legend-value">{belowRange}</span>
        </div>
        <div className="legend-row">
          <span className="legend-dot" style={{ background: 'var(--warn)' }} />
          <span>Above range</span>
          <span className="legend-value">{aboveRange}</span>
        </div>
        <div className="legend-row">
          <span className="legend-dot" style={{ background: 'var(--border-strong)' }} />
          <span>Readings</span>
          <span className="legend-value">{total}</span>
        </div>
      </div>
    </div>
  );
}

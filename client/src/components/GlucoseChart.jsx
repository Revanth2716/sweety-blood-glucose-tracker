import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatShortDate } from '../lib/dates.js';

/**
 * A line chart of the readings of a period, with the target band behind it.
 *
 * @param {{ readings: any[] }} props
 */
export default function GlucoseChart({ readings }) {
  const data = readings.map((reading) => ({
    label: formatShortDate(reading.date),
    value: reading.value,
    slot: reading.slotLabel,
    status: reading.status,
  }));

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="chart" data-testid="glucose-chart">
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 12, right: 24, bottom: 5, left: 0 }}>
          <defs>
            <linearGradient id="glucose-stroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="55%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
            <filter id="glucose-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* The band between 70 and 180 mg/dl, the time in range. */}
          <ReferenceArea y1={70} y2={180} fill="#34d399" fillOpacity={0.06} />

          <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.07)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: '#7b87a6' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#7b87a6' }}
            axisLine={false}
            tickLine={false}
            width={48}
            domain={[40, 'auto']}
            label={{
              value: 'mg/dl',
              angle: -90,
              position: 'insideLeft',
              fontSize: 11,
              fill: '#7b87a6',
            }}
          />
          <Tooltip
            cursor={{ stroke: 'rgba(255,255,255,0.18)' }}
            contentStyle={{
              background: 'rgba(8, 12, 24, 0.95)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12,
              color: '#e9edfb',
            }}
            formatter={(value, name, entry) => [`${value} mg/dl`, entry.payload.slot]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="url(#glucose-stroke)"
            strokeWidth={2.4}
            filter="url(#glucose-glow)"
            dot={{ r: 3, fill: '#0a0f1e', stroke: '#22d3ee', strokeWidth: 1.6 }}
            activeDot={{ r: 5.5, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatShortDate } from '../lib/dates.js';

/**
 * A line chart of the readings of a period.
 *
 * @param {{ readings: any[] }} props
 */
export default function GlucoseChart({ readings }) {
  const data = readings.map((reading) => ({
    label: formatShortDate(reading.date),
    value: reading.value,
    slot: reading.slotLabel,
  }));

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="chart" data-testid="glucose-chart">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            width={45}
            label={{ value: 'mg/dl', angle: -90, position: 'insideLeft', fontSize: 12 }}
          />
          <Tooltip
            formatter={(value) => [`${value} mg/dl`, 'Glucose']}
            labelFormatter={(label) => `Readings on ${label}`}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#2563eb"
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

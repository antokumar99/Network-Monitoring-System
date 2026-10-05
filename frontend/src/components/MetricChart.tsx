import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { Metric } from '../types/device';
import { formatTime } from '../utils/format';

export interface Series {
  key: keyof Metric;
  label: string;
  color: string;
}

interface Props {
  title: string;
  data: Metric[];
  series: Series[];
  unit?: string;
  /** fixed y-axis range, e.g. [0, 100] for percentages */
  domain?: [number, number];
}

export default function MetricChart({ title, data, series, unit = '', domain }: Props) {
  const points = data.map((m) => ({ ...m, time: formatTime(m.recorded_at) }));

  return (
    <div className="card chart-card">
      <div className="card-title">{title}</div>
      {points.length === 0 ? (
        <div className="empty">Waiting for data…</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={points} margin={{ top: 10, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="#2a3446" strokeDasharray="3 3" />
            <XAxis dataKey="time" stroke="#7d8aa3" tick={{ fontSize: 11 }} minTickGap={40} />
            <YAxis stroke="#7d8aa3" tick={{ fontSize: 11 }} domain={domain ?? ['auto', 'auto']} />
            <Tooltip
              contentStyle={{ background: '#161d2b', border: '1px solid #2a3446', borderRadius: 8 }}
              labelStyle={{ color: '#9fb0cc' }}
              formatter={(value) => (typeof value === 'number' ? `${value.toFixed(1)}${unit}` : value)}
            />
            {series.length > 1 && <Legend />}
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

import { Link } from 'react-router-dom';
import type { Device } from '../types/device';
import { formatMbps, formatMs, formatPercent, levelClass, timeAgo, typeLabel } from '../utils/format';
import StatusBadge from './StatusBadge';

function Bar({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="bar-row">
      <span className="bar-label">{label}</span>
      <div className="bar-track">
        <div
          className={`bar-fill ${levelClass(value)}`}
          style={{ width: `${Math.min(100, value ?? 0)}%` }}
        />
      </div>
      <span className="bar-value">{formatPercent(value)}</span>
    </div>
  );
}

export default function DeviceCard({ device }: { device: Device }) {
  const m = device.latest;
  const offline = device.status === 'offline';

  return (
    <Link to={`/devices/${device.id}`} className={`card device-card ${offline ? 'is-offline' : ''}`}>
      <div className="card-head">
        <div>
          <div className="card-title">{device.name}</div>
          <div className="muted small">
            {typeLabel(device.type)} · {device.ip_address}
          </div>
        </div>
        <StatusBadge value={device.status} />
      </div>

      <Bar label="CPU" value={m?.cpu} />
      <Bar label="Memory" value={m?.memory} />

      <div className="card-foot small muted">
        <span>{formatMs(m?.latency)}</span>
        <span>↓ {formatMbps(m?.bandwidth_in)}</span>
        <span>{timeAgo(m?.recorded_at ?? device.last_seen)}</span>
      </div>
    </Link>
  );
}

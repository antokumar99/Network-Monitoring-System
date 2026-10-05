import { Link } from 'react-router-dom';
import type { Device } from '../types/device';
import { formatMs, formatPercent, timeAgo, typeLabel } from '../utils/format';
import StatusBadge from './StatusBadge';

interface Props {
  devices: Device[];
  onDelete?: (device: Device) => void;
}

export default function DeviceTable({ devices, onDelete }: Props) {
  if (devices.length === 0) {
    return <div className="empty">No devices yet. Add one below.</div>;
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>IP address</th>
            <th>Type</th>
            <th>Location</th>
            <th>Status</th>
            <th>CPU</th>
            <th>Memory</th>
            <th>Latency</th>
            <th>Last seen</th>
            {onDelete && <th />}
          </tr>
        </thead>
        <tbody>
          {devices.map((d) => (
            <tr key={d.id}>
              <td>
                <Link to={`/devices/${d.id}`} className="link">
                  {d.name}
                </Link>
                <div className="muted small">{d.sim_id}</div>
              </td>
              <td className="mono">{d.ip_address}</td>
              <td>{typeLabel(d.type)}</td>
              <td>{d.location ?? '—'}</td>
              <td>
                <StatusBadge value={d.status} />
              </td>
              <td>{formatPercent(d.latest?.cpu)}</td>
              <td>{formatPercent(d.latest?.memory)}</td>
              <td>{formatMs(d.latest?.latency)}</td>
              <td className="muted">{timeAgo(d.latest?.recorded_at ?? d.last_seen)}</td>
              {onDelete && (
                <td>
                  <button className="btn btn-danger btn-small" onClick={() => onDelete(d)}>
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

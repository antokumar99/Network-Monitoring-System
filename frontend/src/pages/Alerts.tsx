import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge';
import { getAlerts } from '../services/api';
import { socket } from '../services/socket';
import type { Alert } from '../types/device';
import { formatDateTime, timeAgo } from '../utils/format';

type Filter = 'open' | 'resolved' | 'all';
const FILTERS: Filter[] = ['open', 'resolved', 'all'];

export default function Alerts() {
  const [filter, setFilter] = useState<Filter>('open');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setAlerts(await getAlerts({ status: filter, limit: 100 }));
      setError(null);
    } catch {
      setError('Could not load alerts. Is the backend running on port 5000?');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    void load();
    socket.on('alert:new', load);
    socket.on('alert:resolved', load);
    return () => {
      socket.off('alert:new', load);
      socket.off('alert:resolved', load);
    };
  }, [load]);

  return (
    <div className="page">
      <div className="section-head">
        <h1>Alerts</h1>
        <div className="tabs">
          {FILTERS.map((f) => (
            <button key={f} className={`tab ${filter === f ? 'tab-active' : ''}`} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="banner banner-error">{error}</div>}

      {loading ? (
        <div className="empty">Loading…</div>
      ) : alerts.length === 0 ? (
        <div className="empty">No {filter === 'all' ? '' : filter} alerts.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Device</th>
                <th>Message</th>
                <th>Raised</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id}>
                  <td>
                    <StatusBadge value={a.severity} />
                  </td>
                  <td>
                    <Link to={`/devices/${a.device_id}`} className="link">
                      {a.device_name}
                    </Link>
                  </td>
                  <td>{a.message}</td>
                  <td className="muted" title={formatDateTime(a.created_at)}>
                    {timeAgo(a.created_at)}
                  </td>
                  <td className="muted">{a.resolved_at ? `Resolved ${timeAgo(a.resolved_at)}` : 'Open'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

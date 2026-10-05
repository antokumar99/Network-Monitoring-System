import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DeviceCard from '../components/DeviceCard';
import StatusBadge from '../components/StatusBadge';
import { useLiveDevices } from '../hooks/useLiveDevices';
import { getAlerts } from '../services/api';
import { socket } from '../services/socket';
import type { Alert } from '../types/device';
import { formatMs, formatPercent, timeAgo } from '../utils/format';

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="card stat">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${tone ?? ''}`}>{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const { devices, loading, error } = useLiveDevices();
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const loadAlerts = useCallback(async () => {
    try {
      setAlerts(await getAlerts({ status: 'open', limit: 100 }));
    } catch {
      /* the devices error banner already covers a backend outage */
    }
  }, []);

  useEffect(() => {
    void loadAlerts();
    socket.on('alert:new', loadAlerts);
    socket.on('alert:resolved', loadAlerts);
    return () => {
      socket.off('alert:new', loadAlerts);
      socket.off('alert:resolved', loadAlerts);
    };
  }, [loadAlerts]);

  const stats = useMemo(() => {
    const online = devices.filter((d) => d.status === 'online');
    const withMetrics = online.filter((d) => d.latest);
    const avg = (pick: (d: (typeof devices)[number]) => number) =>
      withMetrics.length ? withMetrics.reduce((sum, d) => sum + pick(d), 0) / withMetrics.length : null;
    return {
      total: devices.length,
      online: online.length,
      offline: devices.filter((d) => d.status === 'offline').length,
      cpu: avg((d) => d.latest!.cpu),
      memory: avg((d) => d.latest!.memory),
      latency: avg((d) => d.latest!.latency),
    };
  }, [devices]);

  const critical = alerts.filter((a) => a.severity === 'critical').length;

  return (
    <div className="page">
      <h1>Dashboard</h1>
      {error && <div className="banner banner-error">{error}</div>}

      <div className="grid stats-grid">
        <Stat label="Devices" value={stats.total} />
        <Stat label="Online" value={stats.online} tone="tone-ok" />
        <Stat label="Offline" value={stats.offline} tone={stats.offline ? 'tone-critical' : ''} />
        <Stat
          label="Open alerts"
          value={alerts.length}
          tone={critical ? 'tone-critical' : alerts.length ? 'tone-warning' : ''}
        />
        <Stat label="Avg CPU" value={formatPercent(stats.cpu)} />
        <Stat label="Avg memory" value={formatPercent(stats.memory)} />
        <Stat label="Avg latency" value={formatMs(stats.latency)} />
      </div>

      <div className="dashboard-layout">
        <section>
          <h2>Devices</h2>
          {loading ? (
            <div className="empty">Loading…</div>
          ) : devices.length === 0 ? (
            <div className="empty">
              No devices found. Did you run <code>database/seed.sql</code>?
            </div>
          ) : (
            <div className="grid device-grid">
              {devices.map((d) => (
                <DeviceCard key={d.id} device={d} />
              ))}
            </div>
          )}
        </section>

        <aside>
          <div className="section-head">
            <h2>Open alerts</h2>
            <Link to="/alerts" className="link small">
              View all
            </Link>
          </div>
          <div className="card alert-list">
            {alerts.length === 0 ? (
              <div className="empty">All clear — no open alerts.</div>
            ) : (
              alerts.slice(0, 8).map((a) => (
                <div key={a.id} className="alert-item">
                  <div className="alert-top">
                    <StatusBadge value={a.severity} />
                    <span className="muted small">{timeAgo(a.created_at)}</span>
                  </div>
                  <div className="alert-device">{a.device_name}</div>
                  <div className="muted small">{a.message}</div>
                </div>
              ))
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

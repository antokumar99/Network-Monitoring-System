import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import MetricChart from '../components/MetricChart';
import StatusBadge from '../components/StatusBadge';
import { getAlerts, getDevice, getMetrics } from '../services/api';
import { socket } from '../services/socket';
import type { Alert, Device, DeviceStatusEvent, Metric } from '../types/device';
import { formatDateTime, formatMbps, formatMs, formatPercent, formatTemp, timeAgo, typeLabel } from '../utils/format';

const HISTORY = 120; // points kept in the charts

export default function DeviceDetails() {
  const { id } = useParams();
  const deviceId = Number(id);

  const [device, setDevice] = useState<Device | null>(null);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    try {
      setAlerts(await getAlerts({ deviceId, limit: 10 }));
    } catch {
      /* non-critical */
    }
  }, [deviceId]);

  useEffect(() => {
    if (!Number.isInteger(deviceId) || deviceId <= 0) {
      setError('Invalid device id');
      return;
    }

    let cancelled = false;
    Promise.all([getDevice(deviceId), getMetrics(deviceId, HISTORY)])
      .then(([d, m]) => {
        if (cancelled) return;
        setDevice(d);
        setMetrics(m);
        setError(null);
      })
      .catch(() => !cancelled && setError('Device not found, or the backend is not running.'));
    void loadAlerts();

    const onMetric = (m: Metric) => {
      if (m.device_id !== deviceId) return;
      setMetrics((prev) => [...prev, m].slice(-HISTORY));
      setDevice((prev) => (prev ? { ...prev, latest: m } : prev));
    };
    const onStatus = (e: DeviceStatusEvent) => {
      if (e.id !== deviceId) return;
      setDevice((prev) => (prev ? { ...prev, status: e.status, last_seen: e.last_seen } : prev));
    };

    socket.on('metric:update', onMetric);
    socket.on('device:status', onStatus);
    socket.on('alert:new', loadAlerts);
    socket.on('alert:resolved', loadAlerts);

    return () => {
      cancelled = true;
      socket.off('metric:update', onMetric);
      socket.off('device:status', onStatus);
      socket.off('alert:new', loadAlerts);
      socket.off('alert:resolved', loadAlerts);
    };
  }, [deviceId, loadAlerts]);

  if (error) {
    return (
      <div className="page">
        <Link to="/devices" className="link">
          ← Back to devices
        </Link>
        <div className="banner banner-error">{error}</div>
      </div>
    );
  }
  if (!device) return <div className="page empty">Loading…</div>;

  const m = device.latest;

  return (
    <div className="page">
      <Link to="/devices" className="link small">
        ← Back to devices
      </Link>

      <div className="detail-head">
        <div>
          <h1>{device.name}</h1>
          <div className="muted">
            {typeLabel(device.type)} · <span className="mono">{device.ip_address}</span> ·{' '}
            {device.location ?? 'No location'} · ID {device.sim_id}
          </div>
        </div>
        <div className="detail-status">
          <StatusBadge value={device.status} />
          <div className="muted small">Last seen {timeAgo(m?.recorded_at ?? device.last_seen)}</div>
        </div>
      </div>

      <div className="grid stats-grid">
        <div className="card stat">
          <div className="stat-label">CPU</div>
          <div className="stat-value">{formatPercent(m?.cpu)}</div>
        </div>
        <div className="card stat">
          <div className="stat-label">Memory</div>
          <div className="stat-value">{formatPercent(m?.memory)}</div>
        </div>
        <div className="card stat">
          <div className="stat-label">Latency</div>
          <div className="stat-value">{formatMs(m?.latency)}</div>
        </div>
        <div className="card stat">
          <div className="stat-label">Packet loss</div>
          <div className="stat-value">{formatPercent(m?.packet_loss)}</div>
        </div>
        <div className="card stat">
          <div className="stat-label">Temperature</div>
          <div className="stat-value">{formatTemp(m?.temperature)}</div>
        </div>
        <div className="card stat">
          <div className="stat-label">Bandwidth in / out</div>
          <div className="stat-value stat-small">
            {formatMbps(m?.bandwidth_in)} / {formatMbps(m?.bandwidth_out)}
          </div>
        </div>
      </div>

      <div className="grid chart-grid">
        <MetricChart
          title="CPU & memory (%)"
          data={metrics}
          unit="%"
          domain={[0, 100]}
          series={[
            { key: 'cpu', label: 'CPU', color: '#4f9cff' },
            { key: 'memory', label: 'Memory', color: '#b48cff' },
          ]}
        />
        <MetricChart
          title="Bandwidth (Mbps)"
          data={metrics}
          unit=" Mbps"
          series={[
            { key: 'bandwidth_in', label: 'In', color: '#3ddc97' },
            { key: 'bandwidth_out', label: 'Out', color: '#ffb454' },
          ]}
        />
        <MetricChart
          title="Latency (ms)"
          data={metrics}
          unit=" ms"
          series={[{ key: 'latency', label: 'Latency', color: '#ff7a90' }]}
        />
        <MetricChart
          title="Temperature (°C)"
          data={metrics}
          unit=" °C"
          series={[{ key: 'temperature', label: 'Temperature', color: '#ffd166' }]}
        />
      </div>

      <h2>Recent alerts</h2>
      <div className="card alert-list">
        {alerts.length === 0 ? (
          <div className="empty">No alerts for this device.</div>
        ) : (
          alerts.map((a) => (
            <div key={a.id} className="alert-item">
              <div className="alert-top">
                <StatusBadge value={a.severity} />
                <span className="muted small">
                  {a.resolved_at ? `Resolved ${timeAgo(a.resolved_at)}` : 'Open'} · {formatDateTime(a.created_at)}
                </span>
              </div>
              <div className="muted small">{a.message}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

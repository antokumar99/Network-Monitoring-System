import { useCallback, useEffect, useState } from 'react';
import { getDevices } from '../services/api';
import { socket } from '../services/socket';
import type { Device, DeviceStatusEvent, Metric } from '../types/device';

/** Loads the device list once, then keeps it live from WebSocket events. */
export function useLiveDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setDevices(await getDevices());
      setError(null);
    } catch {
      setError('Could not load devices. Is the backend running on port 5000?');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();

    const onMetric = (metric: Metric) =>
      setDevices((prev) => prev.map((d) => (d.id === metric.device_id ? { ...d, latest: metric } : d)));

    const onStatus = (event: DeviceStatusEvent) =>
      setDevices((prev) =>
        prev.map((d) =>
          d.id === event.id ? { ...d, status: event.status, last_seen: event.last_seen } : d
        )
      );

    socket.on('metric:update', onMetric);
    socket.on('device:status', onStatus);
    socket.on('connect', load); // resync after a reconnect

    return () => {
      socket.off('metric:update', onMetric);
      socket.off('device:status', onStatus);
      socket.off('connect', load);
    };
  }, [load]);

  return { devices, loading, error, reload: load };
}

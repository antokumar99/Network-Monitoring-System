import axios from 'axios';
import type { Alert, Device, Metric, NewDevice } from '../types/device';

// In dev, Vite proxies /api -> http://localhost:5000
const http = axios.create({ baseURL: '/api', timeout: 10000 });

export const getDevices = (): Promise<Device[]> => http.get<Device[]>('/devices').then((r) => r.data);

export const getDevice = (id: number): Promise<Device> =>
  http.get<Device>(`/devices/${id}`).then((r) => r.data);

export const getMetrics = (id: number, limit = 60): Promise<Metric[]> =>
  http.get<Metric[]>(`/devices/${id}/metrics`, { params: { limit } }).then((r) => r.data);

export const createDevice = (device: NewDevice): Promise<Device> =>
  http.post<Device>('/devices', device).then((r) => r.data);

export const deleteDevice = (id: number): Promise<void> =>
  http.delete(`/devices/${id}`).then(() => undefined);

export interface AlertQuery {
  status?: 'open' | 'resolved' | 'all';
  deviceId?: number;
  limit?: number;
}

export const getAlerts = (query: AlertQuery = {}): Promise<Alert[]> =>
  http
    .get<Alert[]>('/alerts', {
      params: { status: query.status, device_id: query.deviceId, limit: query.limit },
    })
    .then((r) => r.data);

/** Pull a readable message out of an axios error. */
export function errorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    return (err.response?.data as { error?: string } | undefined)?.error ?? fallback;
  }
  return fallback;
}

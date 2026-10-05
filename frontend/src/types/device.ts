export type DeviceStatus = 'online' | 'offline' | 'unknown';
export type DeviceType = 'router' | 'switch' | 'firewall' | 'server' | 'access_point';
export type AlertSeverity = 'warning' | 'critical';

export const DEVICE_TYPES: DeviceType[] = ['router', 'switch', 'firewall', 'server', 'access_point'];

export interface Metric {
  id: number;
  device_id: number;
  cpu: number;
  memory: number;
  bandwidth_in: number;
  bandwidth_out: number;
  latency: number;
  packet_loss: number;
  temperature: number;
  recorded_at: string; // ISO timestamp
}

export interface Device {
  id: number;
  sim_id: string;
  name: string;
  ip_address: string;
  type: DeviceType;
  location: string | null;
  status: DeviceStatus;
  last_seen: string | null;
  created_at: string;
  latest: Metric | null;
}

export interface Alert {
  id: number;
  device_id: number;
  device_name: string;
  type: string;
  severity: AlertSeverity;
  message: string;
  created_at: string;
  resolved_at: string | null;
}

export interface DeviceStatusEvent {
  id: number;
  status: DeviceStatus;
  last_seen: string | null;
}

export interface NewDevice {
  sim_id: string;
  name: string;
  ip_address: string;
  type: DeviceType;
  location?: string;
}

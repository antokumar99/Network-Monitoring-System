import * as AlertModel from '../models/Alert';
import { AlertSeverity } from '../models/Alert';
import * as DeviceModel from '../models/Device';
import { Device } from '../models/Device';
import * as MetricModel from '../models/Metric';
import { fetchAll, SimMetrics, SimReading } from '../tcp/tcpClient';
import { logger } from '../utils/logger';
import { emit } from '../websocket/socket';

interface Rule {
  key: keyof SimMetrics;
  type: string;
  label: string;
  unit: string;
  warning: number;
  critical: number;
}

// Thresholds: value >= warning -> warning alert, value >= critical -> critical alert.
const RULES: Rule[] = [
  { key: 'cpu', type: 'cpu_high', label: 'CPU usage', unit: '%', warning: 80, critical: 92 },
  { key: 'memory', type: 'memory_high', label: 'Memory usage', unit: '%', warning: 85, critical: 95 },
  { key: 'latency', type: 'latency_high', label: 'Latency', unit: ' ms', warning: 100, critical: 200 },
  { key: 'temperature', type: 'temperature_high', label: 'Temperature', unit: ' °C', warning: 70, critical: 80 },
  { key: 'packetLoss', type: 'packet_loss_high', label: 'Packet loss', unit: '%', warning: 2, critical: 5 },
];

const OFFLINE_ALERT = 'device_offline';

let timer: NodeJS.Timeout | null = null;
let purgeTimer: NodeJS.Timeout | null = null;
let polling = false;
let simulatorWasReachable: boolean | null = null;

function severityFor(rule: Rule, value: number): AlertSeverity | null {
  if (value >= rule.critical) return 'critical';
  if (value >= rule.warning) return 'warning';
  return null;
}

async function raiseOrUpdate(
  device: Device,
  type: string,
  severity: AlertSeverity,
  message: string
): Promise<void> {
  const open = await AlertModel.findOpen(device.id, type);
  if (!open) {
    const alert = await AlertModel.create(device.id, type, severity, message);
    logger.warn(`ALERT [${severity}] ${device.name}: ${message}`);
    emit('alert:new', alert);
  } else if (open.severity !== severity) {
    const updated = await AlertModel.updateSeverity(open.id, severity, message);
    if (updated) emit('alert:new', updated);
  }
}

async function resolveIfOpen(device: Device, type: string): Promise<void> {
  const open = await AlertModel.findOpen(device.id, type);
  if (!open) return;
  const resolved = await AlertModel.resolve(open.id);
  if (resolved) {
    logger.info(`Alert resolved: ${device.name} (${type})`);
    emit('alert:resolved', resolved);
  }
}

async function handleOffline(device: Device): Promise<void> {
  if (device.status === 'offline') return;
  await DeviceModel.setStatus(device.id, 'offline');
  emit('device:status', { id: device.id, status: 'offline', last_seen: device.last_seen });
  await raiseOrUpdate(device, OFFLINE_ALERT, 'critical', `${device.name} is not responding`);
}

async function handleOnline(device: Device, m: SimMetrics): Promise<void> {
  const now = new Date();

  const metric = await MetricModel.insert(
    device.id,
    {
      cpu: m.cpu,
      memory: m.memory,
      bandwidth_in: m.bandwidthIn,
      bandwidth_out: m.bandwidthOut,
      latency: m.latency,
      packet_loss: m.packetLoss,
      temperature: m.temperature,
    },
    now
  );

  await DeviceModel.setStatus(device.id, 'online', now);
  if (device.status !== 'online') {
    emit('device:status', { id: device.id, status: 'online', last_seen: now });
    await resolveIfOpen(device, OFFLINE_ALERT);
  }
  emit('metric:update', metric);

  for (const rule of RULES) {
    const value = m[rule.key];
    const severity = severityFor(rule, value);
    if (severity) {
      const threshold = severity === 'critical' ? rule.critical : rule.warning;
      await raiseOrUpdate(
        device,
        rule.type,
        severity,
        `${rule.label} is ${value.toFixed(1)}${rule.unit} (threshold ${threshold}${rule.unit})`
      );
    } else {
      await resolveIfOpen(device, rule.type);
    }
  }
}

async function pollOnce(): Promise<void> {
  if (polling) return; // previous cycle still running
  polling = true;

  try {
    let readings: Map<string, SimReading> | null = null;
    try {
      const all = await fetchAll();
      readings = new Map(all.map((r) => [r.id, r]));
      if (simulatorWasReachable === false) logger.info('Device simulator is reachable again');
      simulatorWasReachable = true;
    } catch (err) {
      if (simulatorWasReachable !== false) {
        logger.warn(`Cannot reach device simulator: ${(err as Error).message}`);
      }
      simulatorWasReachable = false;
    }

    const devices = await DeviceModel.findAll();
    for (const device of devices) {
      try {
        const reading = readings?.get(device.sim_id);
        if (!reading || reading.status !== 'online' || !reading.metrics) {
          await handleOffline(device);
        } else {
          await handleOnline(device, reading.metrics);
        }
      } catch (err) {
        logger.error(`Failed to process device ${device.name}`, err);
      }
    }
  } catch (err) {
    logger.error('Polling cycle failed', err);
  } finally {
    polling = false;
  }
}

export function startMonitoring(): void {
  const interval = Number(process.env.POLL_INTERVAL_MS || 3000);
  const retentionHours = Number(process.env.METRIC_RETENTION_HOURS || 24);

  logger.info(`Monitoring started (polling every ${interval} ms)`);
  void pollOnce();
  timer = setInterval(() => void pollOnce(), interval);

  // Keep the metrics table from growing forever.
  const purge = async () => {
    try {
      const removed = await MetricModel.purgeOlderThan(retentionHours);
      if (removed > 0) logger.info(`Purged ${removed} metric rows older than ${retentionHours}h`);
    } catch (err) {
      logger.error('Metric purge failed', err);
    }
  };
  void purge();
  purgeTimer = setInterval(() => void purge(), 60 * 60 * 1000);
}

export function stopMonitoring(): void {
  if (timer) clearInterval(timer);
  if (purgeTimer) clearInterval(purgeTimer);
  timer = null;
  purgeTimer = null;
}

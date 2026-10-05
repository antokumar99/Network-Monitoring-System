import { isIP } from 'net';
import * as AlertModel from '../models/Alert';
import * as DeviceModel from '../models/Device';
import { Device, DEVICE_TYPES, DeviceInput, DeviceType } from '../models/Device';
import * as MetricModel from '../models/Metric';
import { Metric } from '../models/Metric';

export class ValidationError extends Error {}
export class NotFoundError extends Error {}

export interface DeviceWithLatest extends Device {
  latest: Metric | null;
}

export async function listDevices(): Promise<DeviceWithLatest[]> {
  const [devices, latest] = await Promise.all([
    DeviceModel.findAll(),
    MetricModel.findLatestForAll(),
  ]);
  const byDevice = new Map(latest.map((m) => [m.device_id, m]));
  return devices.map((d) => ({ ...d, latest: byDevice.get(d.id) ?? null }));
}

export async function getDevice(id: number): Promise<DeviceWithLatest> {
  const device = await DeviceModel.findById(id);
  if (!device) throw new NotFoundError(`Device ${id} not found`);
  const [latest] = await MetricModel.findByDevice(id, 1).then((rows) => rows.slice(-1));
  return { ...device, latest: latest ?? null };
}

export async function getMetrics(id: number, limit: number): Promise<Metric[]> {
  const device = await DeviceModel.findById(id);
  if (!device) throw new NotFoundError(`Device ${id} not found`);
  return MetricModel.findByDevice(id, limit);
}

export async function listAlerts(filter: AlertModel.AlertFilter) {
  return AlertModel.list(filter);
}

function cleanString(value: unknown, field: string, maxLen: number): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`${field} is required`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLen) {
    throw new ValidationError(`${field} must be at most ${maxLen} characters`);
  }
  return trimmed;
}

/** Validate a request body. With `partial` true, missing fields are allowed. */
function validate(body: Record<string, unknown>, partial: boolean): Partial<DeviceInput> {
  const out: Partial<DeviceInput> = {};

  if (!partial || body.sim_id !== undefined) out.sim_id = cleanString(body.sim_id, 'sim_id', 32);
  if (!partial || body.name !== undefined) out.name = cleanString(body.name, 'name', 100);

  if (!partial || body.ip_address !== undefined) {
    const ip = cleanString(body.ip_address, 'ip_address', 45);
    if (isIP(ip) === 0) throw new ValidationError('ip_address must be a valid IPv4 or IPv6 address');
    out.ip_address = ip;
  }

  if (!partial || body.type !== undefined) {
    if (!DEVICE_TYPES.includes(body.type as DeviceType)) {
      throw new ValidationError(`type must be one of: ${DEVICE_TYPES.join(', ')}`);
    }
    out.type = body.type as DeviceType;
  }

  if (body.location !== undefined) {
    out.location =
      body.location === null || body.location === ''
        ? null
        : cleanString(body.location, 'location', 100);
  }

  return out;
}

export async function createDevice(body: Record<string, unknown>): Promise<Device> {
  return DeviceModel.create(validate(body, false) as DeviceInput);
}

export async function updateDevice(id: number, body: Record<string, unknown>): Promise<Device> {
  const updated = await DeviceModel.update(id, validate(body, true));
  if (!updated) throw new NotFoundError(`Device ${id} not found`);
  return updated;
}

export async function deleteDevice(id: number): Promise<void> {
  const removed = await DeviceModel.remove(id);
  if (!removed) throw new NotFoundError(`Device ${id} not found`);
}

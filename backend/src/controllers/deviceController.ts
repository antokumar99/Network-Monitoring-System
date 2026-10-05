import { Request, Response } from 'express';
import {
  createDevice,
  deleteDevice,
  getDevice,
  getMetrics,
  listAlerts,
  listDevices,
  NotFoundError,
  updateDevice,
  ValidationError,
} from '../services/deviceService';
import { logger } from '../utils/logger';

function parseId(raw: string): number {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError('id must be a positive integer');
  return id;
}

function parseLimit(raw: unknown, fallback: number, max: number): number {
  if (raw === undefined) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) throw new ValidationError('limit must be a positive integer');
  return Math.min(n, max);
}

function sendError(res: Response, err: unknown): void {
  if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message });
  } else if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message });
  } else if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
    res.status(409).json({ error: 'A device with that sim_id already exists' });
  } else {
    logger.error('Request failed', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

type Handler = (req: Request, res: Response) => Promise<void>;

function handle(fn: Handler): Handler {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      sendError(res, err);
    }
  };
}

export const health = handle(async (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

export const getDevices = handle(async (_req, res) => {
  res.json(await listDevices());
});

export const getDeviceById = handle(async (req, res) => {
  res.json(await getDevice(parseId(req.params.id)));
});

export const getDeviceMetrics = handle(async (req, res) => {
  const id = parseId(req.params.id);
  res.json(await getMetrics(id, parseLimit(req.query.limit, 60, 500)));
});

export const postDevice = handle(async (req, res) => {
  res.status(201).json(await createDevice(req.body ?? {}));
});

export const putDevice = handle(async (req, res) => {
  res.json(await updateDevice(parseId(req.params.id), req.body ?? {}));
});

export const removeDevice = handle(async (req, res) => {
  await deleteDevice(parseId(req.params.id));
  res.status(204).end();
});

export const getAlerts = handle(async (req, res) => {
  const status = (req.query.status as string | undefined) ?? 'all';
  if (!['open', 'resolved', 'all'].includes(status)) {
    throw new ValidationError('status must be open, resolved or all');
  }
  const deviceId = req.query.device_id !== undefined ? parseId(String(req.query.device_id)) : undefined;
  res.json(
    await listAlerts({
      status: status as 'open' | 'resolved' | 'all',
      deviceId,
      limit: parseLimit(req.query.limit, 50, 200),
    })
  );
});

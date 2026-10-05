import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database';

export type AlertSeverity = 'warning' | 'critical';

export interface Alert {
  id: number;
  device_id: number;
  device_name: string;
  type: string;
  severity: AlertSeverity;
  message: string;
  created_at: Date;
  resolved_at: Date | null;
}

type AlertRow = Alert & RowDataPacket;

const SELECT_WITH_DEVICE = `
  SELECT a.*, d.name AS device_name
    FROM alerts a
    JOIN devices d ON d.id = a.device_id`;

export async function findById(id: number): Promise<Alert | null> {
  const [rows] = await pool.query<AlertRow[]>(`${SELECT_WITH_DEVICE} WHERE a.id = ?`, [id]);
  return rows[0] ?? null;
}

/** The currently open (unresolved) alert of this type for a device, if any. */
export async function findOpen(deviceId: number, type: string): Promise<Alert | null> {
  const [rows] = await pool.query<AlertRow[]>(
    `${SELECT_WITH_DEVICE} WHERE a.device_id = ? AND a.type = ? AND a.resolved_at IS NULL LIMIT 1`,
    [deviceId, type]
  );
  return rows[0] ?? null;
}

export async function create(
  deviceId: number,
  type: string,
  severity: AlertSeverity,
  message: string
): Promise<Alert> {
  const [result] = await pool.query<ResultSetHeader>(
    'INSERT INTO alerts (device_id, type, severity, message, created_at) VALUES (?, ?, ?, ?, ?)',
    [deviceId, type, severity, message, new Date()]
  );
  const created = await findById(result.insertId);
  if (!created) throw new Error('Alert was created but could not be read back');
  return created;
}

export async function updateSeverity(
  id: number,
  severity: AlertSeverity,
  message: string
): Promise<Alert | null> {
  await pool.query('UPDATE alerts SET severity = ?, message = ? WHERE id = ?', [
    severity,
    message,
    id,
  ]);
  return findById(id);
}

export async function resolve(id: number): Promise<Alert | null> {
  await pool.query('UPDATE alerts SET resolved_at = ? WHERE id = ? AND resolved_at IS NULL', [
    new Date(),
    id,
  ]);
  return findById(id);
}

export interface AlertFilter {
  status?: 'open' | 'resolved' | 'all';
  deviceId?: number;
  limit?: number;
}

export async function list(filter: AlertFilter = {}): Promise<Alert[]> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filter.status === 'open') where.push('a.resolved_at IS NULL');
  if (filter.status === 'resolved') where.push('a.resolved_at IS NOT NULL');
  if (filter.deviceId !== undefined) {
    where.push('a.device_id = ?');
    params.push(filter.deviceId);
  }

  const sql =
    `${SELECT_WITH_DEVICE}` +
    (where.length ? ` WHERE ${where.join(' AND ')}` : '') +
    ' ORDER BY a.created_at DESC, a.id DESC LIMIT ?';
  params.push(filter.limit ?? 50);

  const [rows] = await pool.query<AlertRow[]>(sql, params);
  return rows;
}

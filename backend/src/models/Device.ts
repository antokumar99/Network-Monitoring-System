import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database';

export type DeviceStatus = 'online' | 'offline' | 'unknown';
export const DEVICE_TYPES = ['router', 'switch', 'firewall', 'server', 'access_point'] as const;
export type DeviceType = (typeof DEVICE_TYPES)[number];

export interface Device {
  id: number;
  sim_id: string;
  name: string;
  ip_address: string;
  type: DeviceType;
  location: string | null;
  status: DeviceStatus;
  last_seen: Date | null;
  created_at: Date;
}

export interface DeviceInput {
  sim_id: string;
  name: string;
  ip_address: string;
  type: DeviceType;
  location?: string | null;
}

type DeviceRow = Device & RowDataPacket;

export async function findAll(): Promise<Device[]> {
  const [rows] = await pool.query<DeviceRow[]>('SELECT * FROM devices ORDER BY id');
  return rows;
}

export async function findById(id: number): Promise<Device | null> {
  const [rows] = await pool.query<DeviceRow[]>('SELECT * FROM devices WHERE id = ?', [id]);
  return rows[0] ?? null;
}

export async function create(input: DeviceInput): Promise<Device> {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO devices (sim_id, name, ip_address, type, location, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'unknown', ?)`,
    [input.sim_id, input.name, input.ip_address, input.type, input.location ?? null, new Date()]
  );
  const created = await findById(result.insertId);
  if (!created) throw new Error('Device was created but could not be read back');
  return created;
}

export async function update(id: number, input: Partial<DeviceInput>): Promise<Device | null> {
  const allowed: (keyof DeviceInput)[] = ['sim_id', 'name', 'ip_address', 'type', 'location'];
  const sets: string[] = [];
  const values: unknown[] = [];

  for (const key of allowed) {
    if (input[key] !== undefined) {
      sets.push(`${key} = ?`);
      values.push(input[key]);
    }
  }
  if (sets.length > 0) {
    await pool.query(`UPDATE devices SET ${sets.join(', ')} WHERE id = ?`, [...values, id]);
  }
  return findById(id);
}

export async function remove(id: number): Promise<boolean> {
  const [result] = await pool.query<ResultSetHeader>('DELETE FROM devices WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

export async function setStatus(
  id: number,
  status: DeviceStatus,
  lastSeen?: Date
): Promise<void> {
  if (lastSeen) {
    await pool.query('UPDATE devices SET status = ?, last_seen = ? WHERE id = ?', [
      status,
      lastSeen,
      id,
    ]);
  } else {
    await pool.query('UPDATE devices SET status = ? WHERE id = ?', [status, id]);
  }
}

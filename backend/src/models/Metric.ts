import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database';

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
  recorded_at: Date;
}

export interface MetricValues {
  cpu: number;
  memory: number;
  bandwidth_in: number;
  bandwidth_out: number;
  latency: number;
  packet_loss: number;
  temperature: number;
}

type MetricRow = Metric & RowDataPacket;

export async function insert(
  deviceId: number,
  values: MetricValues,
  recordedAt: Date
): Promise<Metric> {
  const [result] = await pool.query<ResultSetHeader>(
    `INSERT INTO metrics
       (device_id, cpu, memory, bandwidth_in, bandwidth_out, latency, packet_loss, temperature, recorded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      deviceId,
      values.cpu,
      values.memory,
      values.bandwidth_in,
      values.bandwidth_out,
      values.latency,
      values.packet_loss,
      values.temperature,
      recordedAt,
    ]
  );
  return { id: result.insertId, device_id: deviceId, ...values, recorded_at: recordedAt };
}

/** Most recent `limit` metrics for a device, returned oldest -> newest (chart friendly). */
export async function findByDevice(deviceId: number, limit: number): Promise<Metric[]> {
  const [rows] = await pool.query<MetricRow[]>(
    'SELECT * FROM metrics WHERE device_id = ? ORDER BY recorded_at DESC, id DESC LIMIT ?',
    [deviceId, limit]
  );
  return rows.reverse();
}

/** The newest metric row for every device that has one. */
export async function findLatestForAll(): Promise<Metric[]> {
  const [rows] = await pool.query<MetricRow[]>(
    `SELECT m.*
       FROM metrics m
       JOIN (SELECT device_id, MAX(id) AS max_id FROM metrics GROUP BY device_id) latest
         ON m.id = latest.max_id`
  );
  return rows;
}

export async function purgeOlderThan(hours: number): Promise<number> {
  const cutoff = new Date(Date.now() - hours * 3600 * 1000);
  const [result] = await pool.query<ResultSetHeader>('DELETE FROM metrics WHERE recorded_at < ?', [
    cutoff,
  ]);
  return result.affectedRows;
}

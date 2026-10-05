import mysql from 'mysql2/promise';
import { logger } from '../utils/logger';

// NOTE: server.ts imports "dotenv/config" first, so process.env is already populated here.
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'network_monitor',
  waitForConnections: true,
  connectionLimit: 10,
  // All DATETIME values are stored/read as UTC.
  timezone: 'Z',
  // Return DECIMAL columns as JS numbers instead of strings.
  decimalNumbers: true,
});

export async function testConnection(): Promise<void> {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
    logger.info(
      `MySQL connected (${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 3306}/${
        process.env.DB_NAME || 'network_monitor'
      })`
    );
  } finally {
    conn.release();
  }
}

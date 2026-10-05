import 'dotenv/config'; // must stay the first import
import cors from 'cors';
import express from 'express';
import http from 'http';
import { pool, testConnection } from './config/database';
import deviceRoutes from './routes/deviceRoutes';
import { startMonitoring, stopMonitoring } from './services/monitoringService';
import { logger } from './utils/logger';
import { closeSocket, initSocket } from './websocket/socket';

const PORT = Number(process.env.PORT || 5000);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

async function main(): Promise<void> {
  try {
    await testConnection();
  } catch (err) {
    logger.error(
      'Cannot connect to MySQL. Check backend/.env and that you ran database/schema.sql and seed.sql.',
      (err as Error).message
    );
    process.exit(1);
  }

  const app = express();
  app.use(cors({ origin: CORS_ORIGIN }));
  app.use(express.json());
  app.use('/api', deviceRoutes);
  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

  const server = http.createServer(app);
  initSocket(server, CORS_ORIGIN);

  server.listen(PORT, () => {
    logger.info(`API + WebSocket server listening on http://localhost:${PORT}`);
    startMonitoring();
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received, shutting down...`);
    stopMonitoring();
    await closeSocket();
    server.close();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

void main();

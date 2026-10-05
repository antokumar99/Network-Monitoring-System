import http from 'http';
import { Server } from 'socket.io';
import { logger } from '../utils/logger';

let io: Server | null = null;

export function initSocket(server: http.Server, corsOrigin: string): Server {
  io = new Server(server, {
    cors: { origin: corsOrigin, methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    logger.info(`WebSocket client connected (${socket.id})`);
    socket.on('disconnect', () => logger.info(`WebSocket client disconnected (${socket.id})`));
  });

  return io;
}

/**
 * Events emitted to the dashboard:
 *   metric:update   - a new Metric row for one device
 *   device:status   - { id, status, last_seen } when a device goes online/offline
 *   alert:new       - a newly created (or escalated) Alert
 *   alert:resolved  - an Alert that has just been resolved
 */
export function emit(event: string, payload: unknown): void {
  io?.emit(event, payload);
}

export function closeSocket(): Promise<void> {
  return new Promise((resolve) => {
    if (!io) return resolve();
    io.close(() => resolve());
  });
}

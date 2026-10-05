import { io } from 'socket.io-client';

// Same origin as the page; Vite proxies /socket.io to the backend in dev.
export const socket = io({ transports: ['websocket', 'polling'] });

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The dev server proxies /api and /socket.io to the backend, so the browser
// only ever talks to http://localhost:5173 (no CORS headaches).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/socket.io': { target: 'http://localhost:5000', ws: true },
    },
  },
});

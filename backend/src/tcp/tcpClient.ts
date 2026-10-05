import net from 'net';

export interface SimMetrics {
  cpu: number;
  memory: number;
  bandwidthIn: number;
  bandwidthOut: number;
  latency: number;
  packetLoss: number;
  temperature: number;
}

export interface SimReading {
  id: string;
  type: string;
  status: 'online' | 'offline';
  metrics: SimMetrics | null;
  timestamp: number;
}

const SIM_HOST = () => process.env.SIM_HOST || '127.0.0.1';
const SIM_PORT = () => Number(process.env.SIM_PORT || 9000);

/**
 * Open a connection to the C++ simulator, send one command line and resolve
 * with the one-line reply. Rejects on connection errors or timeout.
 */
export function sendCommand(command: string, timeoutMs = 2000): Promise<string> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let buffer = '';
    let settled = false;

    const finish = (err: Error | null, value?: string) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (err) reject(err);
      else resolve(value as string);
    };

    socket.setTimeout(timeoutMs);
    socket.on('timeout', () => finish(new Error(`Simulator timed out after ${timeoutMs}ms`)));
    socket.on('error', (err) => finish(err));
    socket.on('close', () => finish(new Error('Simulator closed the connection early')));
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const newline = buffer.indexOf('\n');
      if (newline !== -1) finish(null, buffer.slice(0, newline).trim());
    });

    socket.connect(SIM_PORT(), SIM_HOST(), () => {
      socket.write(`${command}\n`);
    });
  });
}

/** Read every device from the simulator in a single round trip. */
export async function fetchAll(): Promise<SimReading[]> {
  const reply = await sendCommand('ALL');
  const parsed = JSON.parse(reply) as { devices?: SimReading[]; error?: string };
  if (parsed.error || !parsed.devices) {
    throw new Error(parsed.error || 'Unexpected reply from simulator');
  }
  return parsed.devices;
}

export async function fetchOne(simId: string): Promise<SimReading> {
  const reply = await sendCommand(`GET ${simId}`);
  const parsed = JSON.parse(reply) as SimReading & { error?: string };
  if (parsed.error) throw new Error(parsed.error);
  return parsed;
}

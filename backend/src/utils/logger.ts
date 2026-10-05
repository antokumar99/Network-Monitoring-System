type Level = 'INFO' | 'WARN' | 'ERROR';

function log(level: Level, message: string, extra?: unknown): void {
  const line = `${new Date().toISOString()} [${level}] ${message}`;
  const out = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.log;
  if (extra !== undefined) {
    out(line, extra);
  } else {
    out(line);
  }
}

export const logger = {
  info: (message: string, extra?: unknown) => log('INFO', message, extra),
  warn: (message: string, extra?: unknown) => log('WARN', message, extra),
  error: (message: string, extra?: unknown) => log('ERROR', message, extra),
};

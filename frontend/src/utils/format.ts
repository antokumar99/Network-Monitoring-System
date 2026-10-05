export const formatPercent = (v: number | null | undefined): string =>
  v == null ? '—' : `${v.toFixed(1)}%`;

export const formatMbps = (v: number | null | undefined): string =>
  v == null ? '—' : `${v.toFixed(0)} Mbps`;

export const formatMs = (v: number | null | undefined): string =>
  v == null ? '—' : `${v.toFixed(1)} ms`;

export const formatTemp = (v: number | null | undefined): string =>
  v == null ? '—' : `${v.toFixed(1)} °C`;

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour12: false });
}

export function formatDateTime(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleString() : '—';
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'never';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export const typeLabel = (type: string): string =>
  type.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase());

/** CSS class for a usage bar based on how close it is to saturation. */
export function levelClass(value: number | null | undefined, warn = 80, crit = 92): string {
  if (value == null) return '';
  if (value >= crit) return 'level-critical';
  if (value >= warn) return 'level-warning';
  return 'level-ok';
}

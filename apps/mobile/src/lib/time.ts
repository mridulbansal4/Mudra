/**
 * Server-clock offset store & custom relative time / countdown formatters.
 * Never uses Intl.RelativeTimeFormat (unsupported in Hermes without polyfill, §7.9 & §10.3).
 */

let serverOffsetMs = 0;

/**
 * Updates the client-to-server clock offset from any RPC response containing `server_now`.
 */
export function setServerNow(serverIso?: string | null): void {
  if (!serverIso) return;
  const parsed = Date.parse(serverIso);
  if (Number.isFinite(parsed)) {
    serverOffsetMs = parsed - Date.now();
  }
}

/**
 * Returns current epoch milliseconds adjusted by the latest known server offset.
 */
export function getServerNow(): number {
  return Date.now() + serverOffsetMs;
}

/**
 * Returns a concise lowercase relative time string without Intl.RelativeTimeFormat.
 * Examples: "just now", "2m ago", "3h ago", "yesterday", "4d ago", "2w ago", "3mo ago".
 */
export function relativeTime(dateOrIso: string | Date, nowMs?: number): string {
  const targetMs =
    typeof dateOrIso === 'string' ? Date.parse(dateOrIso) : dateOrIso.getTime();
  if (!Number.isFinite(targetMs)) return '';

  const baseNow = nowMs ?? getServerNow();
  const diffSec = Math.max(0, Math.floor((baseNow - targetMs) / 1000));

  if (diffSec < 45) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks}w ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) return `${Math.max(1, diffMonths)}mo ago`;

  const diffYears = Math.floor(diffDays / 365);
  return `${Math.max(1, diffYears)}y ago`;
}

/**
 * Computes remaining seconds and tabular mm:ss string for freeze/inspection countdowns.
 */
export function formatCountdown(endsAtIso: string | number): {
  remainingSec: number;
  formatted: string;
  expired: boolean;
} {
  const endMs = typeof endsAtIso === 'number' ? endsAtIso : Date.parse(endsAtIso);
  if (!Number.isFinite(endMs)) {
    return { remainingSec: 0, formatted: '0:00', expired: true };
  }
  const diffMs = endMs - getServerNow();
  const remainingSec = Math.max(0, Math.ceil(diffMs / 1000));
  const mins = Math.floor(remainingSec / 60);
  const secs = remainingSec % 60;
  const formatted = `${mins}:${String(secs).padStart(2, '0')}`;
  return {
    remainingSec,
    formatted,
    expired: remainingSec <= 0,
  };
}

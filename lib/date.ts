export function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseDateOnly(iso: string): number {
  const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return NaN;
  return Date.UTC(y, m - 1, d);
}

export function daysLeft(expiryISO: string): number {
  const exp = parseDateOnly(expiryISO);
  const today = parseDateOnly(todayISO());
  if (isNaN(exp) || isNaN(today)) return NaN;
  return Math.round((exp - today) / 86400000);
}

export function isExpired(expiryISO: string): boolean {
  const left = daysLeft(expiryISO);
  return isNaN(left) ? false : left < 0;
}

export function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

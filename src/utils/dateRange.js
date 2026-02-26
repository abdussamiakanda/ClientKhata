/**
 * Helpers for job date filtering and calendar range selection.
 */

export function getJobTimestampMs(p) {
  const t = p?.timestamp;
  if (!t) return null;
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (t instanceof Date) return t.getTime();
  if (typeof t?.seconds === 'number') return t.seconds * 1000;
  return null;
}

export function getRangeBounds(value, customStartMs, customEndMs) {
  if (value === 'custom' && customStartMs != null && customEndMs != null) {
    const startOfDay = (ms) => {
      const d = new Date(ms);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    };
    const endOfDay = (ms) => {
      const d = new Date(ms);
      d.setHours(23, 59, 59, 999);
      return d.getTime();
    };
    const start = Math.min(customStartMs, customEndMs);
    const end = Math.max(customStartMs, customEndMs);
    return { start: startOfDay(start), end: endOfDay(end) };
  }
  const now = Date.now();
  if (value === 'all') return { start: 0, end: now };
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const end = endOfToday.getTime();
  let start;
  if (value === '7d') start = now - 7 * 24 * 60 * 60 * 1000;
  else if (value === '30d') start = now - 30 * 24 * 60 * 60 * 1000;
  else if (value === '90d') start = now - 90 * 24 * 60 * 60 * 1000;
  else if (value === 'thisMonth') {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    start = d.getTime();
  } else start = 0;
  return { start, end };
}

export function getCalendarDays(year, month) {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const last = new Date(year, month + 1, 0);
  const daysInMonth = last.getDate();
  const cells = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  const total = cells.length;
  const remainder = total % 7;
  if (remainder) for (let i = 0; i < 7 - remainder; i++) cells.push(null);
  return cells;
}

export function formatRangeLabel(startMs, endMs) {
  const s = new Date(startMs);
  const e = new Date(endMs);
  const sameYear = s.getFullYear() === e.getFullYear();
  const sameMonth = s.getMonth() === e.getMonth();
  const opts = { day: 'numeric', month: 'short' };
  if (sameMonth && sameYear) return `${s.getDate()} – ${e.getDate()} ${e.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;
  if (sameYear) return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
  return `${s.toLocaleDateString('en-US', { ...opts, year: 'numeric' })} – ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`;
}

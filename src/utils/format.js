/**
 * Format amount with currency symbol and thousands separator.
 * @param {number} amount
 * @param {string} [currency='BDT'] - Currency code: BDT, USD, EUR
 * @returns {string}
 */
const CURRENCY_SYMBOLS = { BDT: '৳', USD: '$', EUR: '€' };

export function getCurrencySymbol(currency) {
  return CURRENCY_SYMBOLS[currency] ?? '৳';
}

export function formatAmount(amount, currency = 'BDT') {
  if (amount == null || Number.isNaN(Number(amount))) return '—';
  const num = Number(amount);
  const symbol = getCurrencySymbol(currency);
  const locale = currency === 'BDT' ? 'en-BD' : currency === 'EUR' ? 'de-DE' : 'en-US';
  return `${symbol}${num.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

/**
 * CSS class for job status badge.
 * @param {string} [status]
 * @returns {string}
 */
export function getStatusBadgeClass(status) {
  switch (status) {
    case 'Paid':
      return 'status-paid';
    case 'Pending':
      return 'status-pending';
    case 'Ongoing':
      return 'status-ongoing';
    case 'Delivered':
      return 'status-delivered';
    default:
      return 'status-default';
  }
}

/**
 * Format a Firestore Timestamp for display (e.g. status date).
 * @param {import('firebase/firestore').Timestamp | null | undefined} ts
 * @param {{ short?: boolean, longDate?: boolean, time?: boolean }} [opts]
 * @returns {string}
 */
export function formatTimestamp(ts, opts = {}) {
  if (!ts || !ts.toDate) return '—';
  const d = ts.toDate();
  if (opts.longDate) {
    const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    if (opts.time) {
      const timeStr = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
      return `${dateStr}, ${timeStr}`;
    }
    return dateStr;
  }
  if (opts.short) return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

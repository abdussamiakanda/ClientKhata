/**
 * Firestore Data Schema - 'payments' collection (jobs/work under a client)
 *
 * Clients are stored in 'clients' collection. Each payment/job references a client.
 *
 * Job status flow: Pending → Ongoing → Delivered → Paid (each with optional timestamp).
 * Payment status / recording pay will be handled on a separate payments page later.
 *
 * Document fields:
 * - clientId: (string) Document ID of the client in 'clients' collection
 * - clientName: (string) Denormalized client name for display
 * - workDescription: (string) Project or task
 * - amount: (number) Payment amount (in selected currency)
 * - currency: (string) 'BDT' | 'USD' | 'EUR'
 * - notes: (string) Optional notes for the job
 * - status: (string) Job status: 'Pending' | 'Ongoing' | 'Delivered' | 'Paid'
 * - pendingAt, ongoingAt, deliveredAt, paidAt: (Firestore Timestamp) When entered that status
 * - paymentRecordedAt: (Firestore Timestamp) When payment was recorded (Payments page)
 * - isDelivered: (boolean) Legacy; true when status is Delivered or Paid
 * - timestamp: (Firestore Timestamp) When the entry was created
 * - userId: (string) Owner of the record
 */

/** Job status flow: Pending → Ongoing → Delivered → Paid. Paid is final (not draggable). */
export const JOB_STATUSES = ['Pending', 'Ongoing', 'Delivered', 'Paid'];

/** Supported currencies for job amounts. */
export const CURRENCIES = [
  { code: 'BDT', symbol: '৳', label: 'BDT (৳)' },
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
];

/** @typedef { 'BDT' | 'USD' | 'EUR' } CurrencyCode */

/** @typedef { 'Pending' | 'Ongoing' | 'Delivered' | 'Paid' } JobStatus */

/**
 * @typedef {Object} PaymentEntry
 * @property {string} [id] - Document ID (set when read from Firestore)
 * @property {string} clientId
 * @property {string} clientName
 * @property {string} workDescription
 * @property {number} amount
 * @property {CurrencyCode} [currency] - Default BDT
 * @property {string} [notes] - Optional notes
 * @property {JobStatus} status
 * @property {import('firebase/firestore').Timestamp} [pendingAt]
 * @property {import('firebase/firestore').Timestamp} [ongoingAt]
 * @property {import('firebase/firestore').Timestamp} [deliveredAt]
 * @property {import('firebase/firestore').Timestamp} [paidAt]
 * @property {import('firebase/firestore').Timestamp} [paymentRecordedAt] - When payment was recorded
 * @property {boolean} [isDelivered] - Legacy; true when status is Delivered or Paid
 * @property {import('firebase/firestore').Timestamp} [timestamp]
 * @property {string} [userId]
 */

/**
 * @param {Omit<PaymentEntry, 'id' | 'timestamp' | 'pendingAt' | 'ongoingAt' | 'deliveredAt' | 'paidAt'>} data
 * @returns {Record<string, unknown>}
 */
export function createPaymentData(data) {
  const status = data.status && JOB_STATUSES.includes(data.status) ? data.status : 'Pending';
  const currency = data.currency && CURRENCIES.some((c) => c.code === data.currency) ? data.currency : 'BDT';
  return {
    clientId: data.clientId != null ? String(data.clientId) : '',
    clientName: data.clientName != null ? String(data.clientName) : '',
    workDescription: data.workDescription != null ? String(data.workDescription) : '',
    amount: Number(data.amount),
    currency,
    notes: data.notes != null ? String(data.notes).trim() : '',
    status,
    isDelivered: status === 'Delivered' || status === 'Paid',
    ...(data.userId && { userId: data.userId }),
  };
}

/** Status timestamp field names keyed by status */
export const STATUS_TIMESTAMP_KEYS = {
  Pending: 'pendingAt',
  Ongoing: 'ongoingAt',
  Delivered: 'deliveredAt',
  Paid: 'paidAt',
};

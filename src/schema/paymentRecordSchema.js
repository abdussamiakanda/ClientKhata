/**
 * Firestore Data Schema - 'payment_records' collection
 *
 * Each document is a payment received for a job (partial or full).
 * Multiple records per job are allowed; sum of amounts can equal job amount.
 *
 * Document fields:
 * - jobId: (string) Document ID of the job in 'payments' collection
 * - amount: (number) Payment amount (৳)
 * - paidAt: (Firestore Timestamp) When received
 * - note: (string) Optional note
 * - userId: (string) Optional, who recorded it
 */

/**
 * @typedef {Object} PaymentRecord
 * @property {string} [id] - Document ID
 * @property {string} jobId
 * @property {number} amount
 * @property {import('firebase/firestore').Timestamp} [paidAt]
 * @property {string} [note]
 * @property {string} [userId]
 */

/**
 * @param {Partial<PaymentRecord>} data
 * @returns {Record<string, unknown>}
 */
export function createPaymentRecordData(data) {
  return {
    jobId: data.jobId != null ? String(data.jobId) : '',
    amount: Number(data.amount) || 0,
    note: data.note != null ? String(data.note).trim() : '',
    ...(data.userId && { userId: data.userId }),
  };
}

/**
 * Firestore Data Schema - 'payment_records' collection
 *
 * Each document is a payment received for a job (partial or full) or a salary payment.
 * Multiple records per job/client are allowed.
 *
 * Document fields:
 * - jobId: (string) Document ID of the job in 'payments' collection (for job payments)
 * - amount: (number) Payment amount
 * - paidAt: (Firestore Timestamp) When received
 * - note: (string) Optional note
 * - userId: (string) Optional, who recorded it
 * - isSalaryPayment: (boolean) If true, this is a salary payment (not linked to a job)
 * - clientId: (string) Client ID for salary payments
 * - salaryMonth: (number) Month (1-12) the salary is for
 * - salaryYear: (number) Year the salary is for
 */

/**
 * @typedef {Object} PaymentRecord
 * @property {string} [id] - Document ID
 * @property {string} [jobId] - Job ID for job payments
 * @property {number} amount
 * @property {import('firebase/firestore').Timestamp} [paidAt]
 * @property {string} [note]
 * @property {string} [userId]
 * @property {boolean} [isSalaryPayment] - If true, this is a salary payment
 * @property {string} [clientId] - Client ID for salary payments
 * @property {number} [salaryMonth] - Month (1-12) the salary is for
 * @property {number} [salaryYear] - Year the salary is for
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
    ...(data.isSalaryPayment && {
      isSalaryPayment: true,
      clientId: String(data.clientId || ''),
      salaryMonth: Number(data.salaryMonth) || 1,
      salaryYear: Number(data.salaryYear) || new Date().getFullYear(),
    }),
  };
}

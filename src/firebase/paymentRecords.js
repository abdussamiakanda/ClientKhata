import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { createPaymentRecordData } from '../schema/paymentRecordSchema';

const PAYMENT_RECORDS_COLLECTION = 'payment_records';
const PAYMENTS_COLLECTION = 'payments';

/**
 * Subscribe to all payment records (team-wide; real-time).
 * @param {(records: import('../schema/paymentRecordSchema').PaymentRecord[]) => void} onUpdate
 * @returns {() => void} Unsubscribe function
 */
export function subscribePaymentRecords(onUpdate) {
  const q = query(
    collection(db, PAYMENT_RECORDS_COLLECTION),
    orderBy('paidAt', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const records = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      paidAt: d.data().paidAt,
    }));
    onUpdate(records);
  });
}

/**
 * Add a payment record for a job. Sets job status to Paid only when paid in full AND job is already Delivered.
 * @param {string} jobId
 * @param {number} amount
 * @param {string} [note]
 * @param {string} [userId]
 * @param {number} jobAmount - Job's total amount (to check if fully paid)
 * @param {number} currentTotal - Current sum of payment records for this job (before adding)
 * @param {string} [jobStatus] - Current job status; only set to Paid when status is 'Delivered'
 */
export async function addPaymentRecord(jobId, amount, note, userId, jobAmount, currentTotal, jobStatus) {
  const newTotal = (currentTotal || 0) + Number(amount);
  const payload = createPaymentRecordData({ jobId, amount, note, userId: userId || '' });
  const ref = await addDoc(collection(db, PAYMENT_RECORDS_COLLECTION), {
    ...payload,
    paidAt: serverTimestamp(),
  });

  const fullyPaid = newTotal >= Number(jobAmount);
  const isDelivered = jobStatus === 'Delivered';
  if (fullyPaid && isDelivered) {
    const jobRef = doc(db, PAYMENTS_COLLECTION, jobId);
    await updateDoc(jobRef, {
      status: 'Paid',
      paidAt: serverTimestamp(),
      paymentRecordedAt: serverTimestamp(),
      isDelivered: true,
    });
  }
  return ref.id;
}

/**
 * Delete a payment record. Caller should update job status to Delivered if total < job amount.
 * @param {string} recordId
 */
export async function deletePaymentRecord(recordId) {
  const ref = doc(db, PAYMENT_RECORDS_COLLECTION, recordId);
  await deleteDoc(ref);
}

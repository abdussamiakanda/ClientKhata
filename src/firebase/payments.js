import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteField,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { createPaymentData, JOB_STATUSES, STATUS_TIMESTAMP_KEYS } from '../schema/paymentSchema';

const PAYMENTS_COLLECTION = 'payments';

/**
 * Subscribe to all payments/jobs (team-wide; real-time).
 * @param {(payments: import('../schema/paymentSchema').PaymentEntry[]) => void} onUpdate
 * @returns {() => void} Unsubscribe function
 */
export function subscribePayments(onUpdate) {
  const q = query(
    collection(db, PAYMENTS_COLLECTION),
    orderBy('timestamp', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const payments = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      timestamp: d.data().timestamp,
    }));
    onUpdate(payments);
  });
}

/**
 * Add a new payment/job. Sets status to Pending and pendingAt to server timestamp.
 * @param {string} [userId] - Creator user id (optional, for audit)
 * @param {Omit<import('../schema/paymentSchema').PaymentEntry, 'id' | 'timestamp' | 'pendingAt' | 'ongoingAt' | 'deliveredAt' | 'paidAt'>} data
 */
export async function addPayment(userId, data) {
  const payload = createPaymentData({ ...data, status: 'Pending', userId: userId || '' });
  const ref = await addDoc(collection(db, PAYMENTS_COLLECTION), {
    ...payload,
    pendingAt: serverTimestamp(),
    timestamp: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Update an existing payment. When status is provided, sets the corresponding status timestamp (e.g. ongoingAt) and isDelivered.
 * @param {string} paymentId
 * @param {Partial<import('../schema/paymentSchema').PaymentEntry>} data
 */
export async function updatePayment(paymentId, data) {
  const ref = doc(db, PAYMENTS_COLLECTION, paymentId);
  const payload = { ...data };
  if (typeof payload.amount === 'number') payload.amount = payload.amount;
  else if (payload.amount != null) payload.amount = Number(payload.amount);
  if (payload.clearPaymentRecordedAt) {
    payload.paymentRecordedAt = deleteField();
    delete payload.clearPaymentRecordedAt;
  } else if (payload.paymentRecordedAt !== undefined) {
    payload.paymentRecordedAt = serverTimestamp();
  }
  if (payload.status && JOB_STATUSES.includes(payload.status)) {
    const newStatus = payload.status;
    const setDeliveredAt = payload.setDeliveredAt === true;
    delete payload.setDeliveredAt;
    const statusOrder = { Pending: 0, Ongoing: 1, Delivered: 2, Paid: 3 };
    const newOrder = statusOrder[newStatus];
    // When moving backward, clear timestamps for all statuses after the new one (supports corrections: e.g. Delivered → Ongoing)
    if (newOrder < 3) payload.paidAt = deleteField();
    if (newOrder < 2) payload.deliveredAt = deleteField();
    if (newOrder < 1) payload.ongoingAt = deleteField();
    const tsKey = STATUS_TIMESTAMP_KEYS[newStatus];
    if (tsKey) payload[tsKey] = serverTimestamp();
    if (newStatus === 'Paid' && setDeliveredAt) payload.deliveredAt = serverTimestamp();
    payload.isDelivered = newStatus === 'Delivered' || newStatus === 'Paid';
    if (newStatus === 'Delivered') {
      payload.paymentRecordedAt = deleteField();
    }
  }
  delete payload.id;
  delete payload.timestamp;
  delete payload.userId;
  await updateDoc(ref, payload);
}

/**
 * Delete a payment.
 * @param {string} paymentId
 */
export async function deletePayment(paymentId) {
  const ref = doc(db, PAYMENTS_COLLECTION, paymentId);
  await deleteDoc(ref);
}

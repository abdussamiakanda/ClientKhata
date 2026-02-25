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
    const tsKey = STATUS_TIMESTAMP_KEYS[payload.status];
    if (tsKey) payload[tsKey] = serverTimestamp();
    payload.isDelivered = payload.status === 'Delivered' || payload.status === 'Paid';
    if (payload.status === 'Delivered') {
      payload.paidAt = deleteField();
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

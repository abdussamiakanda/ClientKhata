import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  deleteField,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { createPaymentData, JOB_STATUSES, STATUS_TIMESTAMP_KEYS } from '../schema/paymentSchema';
import { encryptData, decryptData, getGlobalEncryptionKey } from '../utils/encryption';

const PAYMENTS_COLLECTION = 'payments';

const ENCRYPTED_FIELDS = ['clientName', 'workDescription', 'notes', 'amount', 'title', 'description'];

function encryptPaymentPayload(data) {
  const key = getGlobalEncryptionKey();
  if (!key) return data;
  const result = { ...data };
  ENCRYPTED_FIELDS.forEach(f => {
    if (result[f] != null && result[f] !== '') {
      result[f] = encryptData(String(result[f]), key);
    }
  });
  return result;
}

function decryptPaymentPayload(data) {
  const key = getGlobalEncryptionKey();
  if (!key) return data;
  const result = { ...data };
  ENCRYPTED_FIELDS.forEach(f => {
    if (result[f] != null && result[f] !== '') {
      const decrypted = decryptData(String(result[f]), key);
      result[f] = f === 'amount' ? Number(decrypted) : decrypted;
    }
  });
  return result;
}

/**
 * Subscribe to payments/jobs for the current user (personal; real-time).
 * Only documents with userId === uid are returned.
 * @param {string} uid - Current user id (required)
 * @param {(payments: import('../schema/paymentSchema').PaymentEntry[]) => void} onUpdate
 * @returns {() => void} Unsubscribe function
 */
export function subscribePayments(uid, onUpdate) {
  const q = query(
    collection(db, PAYMENTS_COLLECTION),
    where('userId', '==', uid),
    orderBy('timestamp', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const payments = snapshot.docs.map((d) => {
      const data = d.data();
      const decryptedData = decryptPaymentPayload(data);
      return {
        id: d.id,
        ...decryptedData,
        timestamp: data.timestamp,
      };
    });
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
  const encryptedPayload = encryptPaymentPayload(payload);
  const ref = await addDoc(collection(db, PAYMENTS_COLLECTION), {
    ...encryptedPayload,
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
  
  const encryptedPayload = encryptPaymentPayload(payload);
  await updateDoc(ref, encryptedPayload);
}

/**
 * Update only timestamp fields on a payment (e.g. from job detail page date edits).
 * @param {string} paymentId
 * @param {{ timestamp?: Date, ongoingAt?: Date, deliveredAt?: Date, paidAt?: Date }} updates - Date values for each field to update
 */
export async function updatePaymentTimestamps(paymentId, updates) {
  const ref = doc(db, PAYMENTS_COLLECTION, paymentId);
  const payload = {};
  const keys = ['timestamp', 'ongoingAt', 'deliveredAt', 'paidAt'];
  keys.forEach((key) => {
    const value = updates[key];
    if (value instanceof Date) {
      payload[key] = Timestamp.fromDate(value);
    }
  });
  if (Object.keys(payload).length === 0) return;
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

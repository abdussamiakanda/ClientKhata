import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import { getGlobalEncryptionKey, deriveInvoiceKey, encryptData } from '../utils/encryption';

const INVOICES_COLLECTION = 'invoices';

/**
 * Fetch a public invoice by its Job ID.
 * Since the invoice ID maps 1-to-1 with the job ID, we use jobId as the doc ID.
 * @param {string} jobId 
 * @returns {Promise<any>}
 */
export async function getPublicInvoice(jobId) {
  const ref = doc(db, INVOICES_COLLECTION, jobId);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() };
  }
  return null;
}

/**
 * Creates or updates the public invoice snapshot for a given job.
 * This is called automatically when an owner views an invoice, or modifies a job/payment.
 */
export async function syncInvoiceData(jobId, userId, displayName, job, client, paymentRecords, profile) {
  if (!jobId || !userId || !job) return;
  
  const totalPaid = (paymentRecords || []).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const balanceDue = Math.max(0, Number(job.amount || 0) - totalPaid);
  
  const invoiceData = {
    userId,
    updatedAt: serverTimestamp()
  };

  const sensitivePayload = {
    business: {
      name: profile?.businessName || displayName || 'My Business',
      address: profile?.address || '',
      phone: profile?.phone || '',
      email: profile?.email || ''
    },
    jobId,
    invoiceNumber: `INV-${jobId.substring(0, 8).toUpperCase()}`,
    currency: job.currency || 'BDT',
    createdAt: job.timestamp?.toMillis ? job.timestamp.toMillis() : Date.now(),
    client: client ? {
      name: client.clientName || '',
      institution: client.institution || '',
      address: client.address || '',
      contactNumber: client.contactNumber || '',
      email: client.email || ''
    } : { name: job.clientName || 'Unknown Client' },
    job: {
      workDescription: job.workDescription || 'Services rendered',
      notes: job.notes || '',
      amount: Number(job.amount || 0),
    },
    summary: {
      subtotal: Number(job.amount || 0),
      totalPaid,
      balanceDue
    }
  };

  const dek = getGlobalEncryptionKey();
  if (dek) {
    const invoiceKey = deriveInvoiceKey(jobId, dek);
    if (invoiceKey) {
      invoiceData.encryptedPayload = encryptData(JSON.stringify(sensitivePayload), invoiceKey);
    } else {
      Object.assign(invoiceData, sensitivePayload);
    }
  } else {
    Object.assign(invoiceData, sensitivePayload);
  }
  
  const ref = doc(db, INVOICES_COLLECTION, jobId);
  await setDoc(ref, invoiceData, { merge: true });
}

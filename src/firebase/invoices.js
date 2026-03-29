import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

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
    businessName: profile?.businessName || displayName || 'My Business',
    business: {
      name: profile?.businessName || displayName || 'My Business',
      address: profile?.address || '',
      phone: profile?.phone || '',
      email: profile?.email || ''
    },
    jobId,
    invoiceNumber: `INV-${jobId.substring(0, 8).toUpperCase()}`,
    currency: job.currency || 'BDT',
    createdAt: job.timestamp || serverTimestamp(),
    updatedAt: serverTimestamp(),
    
    // Snapshot of client
    client: client ? {
      name: client.clientName || '',
      institution: client.institution || '',
      address: client.address || '',
      contactNumber: client.contactNumber || '',
      email: client.email || ''
    } : { name: job.clientName || 'Unknown Client' },
    
    // Snapshot of job items
    job: {
      workDescription: job.workDescription || 'Services rendered',
      notes: job.notes || '',
      amount: Number(job.amount || 0),
    },
    
    // Calculated totals
    summary: {
      subtotal: Number(job.amount || 0),
      totalPaid,
      balanceDue
    }
  };
  
  const ref = doc(db, INVOICES_COLLECTION, jobId);
  await setDoc(ref, invoiceData, { merge: true });
}

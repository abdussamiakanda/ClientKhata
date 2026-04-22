import { collection, query, where, getDocs, doc, writeBatch, deleteField } from 'firebase/firestore';
import { db } from './config';
import { encryptData, decryptData, getGlobalEncryptionKey, deriveInvoiceKey } from '../utils/encryption';

const MIGRATE_BATCH_SIZE = 500; // Firestore limit for write batches

/**
 * Checks if a string needs encryption.
 * @param {any} value
 * @returns {boolean}
 */
function needsEncryption(value) {
  return typeof value === 'string' && value.trim() !== '' && !value.startsWith('ENC:');
}

/**
 * Migrates unencrypted user data to encrypted ciphertext.
 * This runs one time when a user first establishes an encryption password.
 * @param {string} uid - The current user's ID
 */
export async function migrateUnencryptedData(uid) {
  const key = getGlobalEncryptionKey();
  if (!key) return; // Cannot migrate without a key

  try {
    let batch = writeBatch(db);
    let operationCount = 0;

    async function commitBatchIfNeeded() {
      if (operationCount >= MIGRATE_BATCH_SIZE) {
        await batch.commit();
        batch = writeBatch(db);
        operationCount = 0;
      }
    }

    // 1. Migrate Clients
    const clientsQ = query(collection(db, 'clients'), where('userId', '==', uid));
    const clientsSnap = await getDocs(clientsQ);
    
    clientsSnap.forEach(clientDoc => {
      const data = clientDoc.data();
      const fieldsToEncrypt = ['clientName', 'institution', 'contactNumber', 'email', 'website', 'address', 'notes', 'imageBase64'];
      let needsUpdate = false;
      const updates = {};
      
      fieldsToEncrypt.forEach(f => {
        if (needsEncryption(data[f])) {
          updates[f] = encryptData(data[f], key);
          needsUpdate = true;
        }
      });
      
      if (needsUpdate) {
        batch.update(clientDoc.ref, updates);
        operationCount++;
      }
    });

    await commitBatchIfNeeded();

    // 2. Migrate Payments (Jobs)
    const paymentsQ = query(collection(db, 'payments'), where('userId', '==', uid));
    const paymentsSnap = await getDocs(paymentsQ);
    
    paymentsSnap.forEach(paymentDoc => {
      const data = paymentDoc.data();
      const fieldsToEncrypt = ['clientName', 'workDescription', 'notes', 'amount', 'title', 'description'];
      let needsUpdate = false;
      const updates = {};
      
      fieldsToEncrypt.forEach(f => {
        const val = data[f];
        // 'amount' could be a number, store as string when encrypted
        if (val != null && val !== '') {
          const stringVal = String(val);
          if (needsEncryption(stringVal)) {
            updates[f] = encryptData(stringVal, key);
            needsUpdate = true;
          }
        }
      });
      
      if (needsUpdate) {
        batch.update(paymentDoc.ref, updates);
        operationCount++;
      }
    });

    await commitBatchIfNeeded();

    // 3. Migrate Payment Records
    const recordsQ = query(collection(db, 'payment_records'), where('userId', '==', uid));
    const recordsSnap = await getDocs(recordsQ);
    
    recordsSnap.forEach(recordDoc => {
      const data = recordDoc.data();
      const fieldsToEncrypt = ['amount', 'note'];
      let needsUpdate = false;
      const updates = {};
      
      fieldsToEncrypt.forEach(f => {
        const val = data[f];
        if (val != null && val !== '') {
          const stringVal = String(val);
          if (needsEncryption(stringVal)) {
            updates[f] = encryptData(stringVal, key);
            needsUpdate = true;
          }
        }
      });
      
      if (needsUpdate) {
        batch.update(recordDoc.ref, updates);
        operationCount++;
      }
    });
    // 4. Migrate Invoices
    const invoicesQ = query(collection(db, 'invoices'), where('userId', '==', uid));
    const invoicesSnap = await getDocs(invoicesQ);
    
    invoicesSnap.forEach(invDoc => {
      const data = invDoc.data();
      const needsFullMigration = !data.encryptedPayload && data.jobId;
      const hasLeakedBusiness = !!(data.encryptedPayload && (data.business || data.businessName));
      
      if (needsFullMigration || hasLeakedBusiness) {
        let sensitivePayload;
        const invoiceKey = deriveInvoiceKey(data.jobId || invDoc.id, key);

        if (hasLeakedBusiness && invoiceKey) {
          try {
            const dec = decryptData(data.encryptedPayload, invoiceKey);
            sensitivePayload = JSON.parse(dec); // If this fails, sensitivePayload stays undefined
          } catch (e) {
            console.error('Could not decrypt partially migrated invoice', e);
            return; // ABORT completely if decryption fails! Don't overwrite it with blank data!
          }
        }

        if (!sensitivePayload && needsFullMigration) {
          // This only runs for fully PLAINTEXT invoices that need complete migration
          sensitivePayload = {
            jobId: data.jobId || invDoc.id,
            invoiceNumber: data.invoiceNumber || '',
            currency: data.currency || 'BDT',
            createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
            client: data.client || { name: data.clientName || 'Unknown Client' },
            job: data.job || { workDescription: data.workDescription || '', amount: data.amount || 0 },
            summary: data.summary || { subtotal: data.amount || 0, balanceDue: data.amount || 0 }
          };
        }

        if (!sensitivePayload) return; // Failsafe

        sensitivePayload.business = sensitivePayload.business || data.business || {
          name: data.businessName || 'My Business',
          address: '',
          phone: '',
          email: ''
        };
        
        if (invoiceKey) {
          const encryptedPayload = encryptData(JSON.stringify(sensitivePayload), invoiceKey);
          
          batch.update(invDoc.ref, {
            encryptedPayload,
            businessName: deleteField(),
            business: deleteField(),
            jobId: deleteField(),
            invoiceNumber: deleteField(),
            currency: deleteField(),
            createdAt: deleteField(),
            client: deleteField(),
            job: deleteField(),
            summary: deleteField(),
            clientName: deleteField(),
            workDescription: deleteField(),
            amount: deleteField(),
          });
          operationCount++;
        }
      }
    });

    await commitBatchIfNeeded();

    if (operationCount > 0) {
      await batch.commit();
    }
    
    console.log('Migration of unencrypted data completed successfully.');
    
  } catch (err) {
    console.error('Failed to migrate unencrypted data:', err);
  }
}

async function deleteCollectionByUserId(collectionName, uid) {
  const q = query(collection(db, collectionName), where('userId', '==', uid));
  const snap = await getDocs(q);
  if (snap.empty) return;

  let batch = writeBatch(db);
  let operationCount = 0;

  for (const item of snap.docs) {
    batch.delete(item.ref);
    operationCount++;
    if (operationCount === MIGRATE_BATCH_SIZE) {
      await batch.commit();
      batch = writeBatch(db);
      operationCount = 0;
    }
  }

  if (operationCount > 0) {
    await batch.commit();
  }
}

/**
 * Permanently wipes all encrypted vault data for a user.
 * This is intended as a last-resort recovery path when both master password
 * and recovery key are lost.
 * @param {string} uid - The current user's ID
 */
export async function resetEncryptedVault(uid) {
  if (!uid) return;

  await Promise.all([
    deleteCollectionByUserId('clients', uid),
    deleteCollectionByUserId('payments', uid),
    deleteCollectionByUserId('payment_records', uid),
    deleteCollectionByUserId('invoices', uid)
  ]);

  const profileRef = doc(db, 'user_profiles', uid);
  let batch = writeBatch(db);
  batch.set(profileRef, {
    encryptionSetup: false,
    recoverySetup: false,
    encryptedDataKey: deleteField(),
    encryptedDataKeyByRecovery: deleteField(),
  }, { merge: true });
  await batch.commit();
}

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
} from 'firebase/firestore';
import { db } from './config';
import { createClientData } from '../schema/clientSchema';
import { encryptData, decryptData, getGlobalEncryptionKey } from '../utils/encryption';

const CLIENTS_COLLECTION = 'clients';

const ENCRYPTED_FIELDS = ['clientName', 'institution', 'contactNumber', 'email', 'website', 'address', 'notes', 'imageBase64'];

function encryptClientPayload(data) {
  const key = getGlobalEncryptionKey();
  if (!key) return data; // Wait for key
  const result = { ...data };
  ENCRYPTED_FIELDS.forEach(f => {
    if (result[f]) result[f] = encryptData(String(result[f]), key);
  });
  return result;
}

function decryptClientPayload(data) {
  const key = getGlobalEncryptionKey();
  if (!key) return data;
  const result = { ...data };
  ENCRYPTED_FIELDS.forEach(f => {
    if (result[f]) result[f] = decryptData(String(result[f]), key);
  });
  return result;
}

/**
 * Subscribe to clients for the current user (personal; real-time).
 * Only documents with userId === uid are returned.
 * @param {string} uid - Current user id (required)
 * @param {(clients: import('../schema/clientSchema').Client[]) => void} onUpdate
 * @returns {() => void} Unsubscribe function
 */
export function subscribeClients(uid, onUpdate) {
  const q = query(
    collection(db, CLIENTS_COLLECTION),
    where('userId', '==', uid)
  );
  return onSnapshot(q, (snapshot) => {
    const clients = snapshot.docs.map((d) => {
      const data = d.data();
      const decryptedData = decryptClientPayload(data);
      return {
        id: d.id,
        ...decryptedData,
        createdAt: data.createdAt,
      };
    });
    clients.sort((a, b) => {
      const aActive = a.active !== false;
      const bActive = b.active !== false;
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      return (a.clientName || '').localeCompare(b.clientName || '');
    });
    onUpdate(clients);
  });
}

/**
 * Add a new client. Optional createdBy for audit.
 * @param {string} [createdBy] - User id of creator (optional, for audit)
 * @param {import('../schema/clientSchema').Client & { userId?: string }} data
 * @returns {Promise<string>} New client document id
 */
export async function addClient(createdBy, data) {
  const payload = createClientData({ ...data, userId: createdBy || '' });
  const encryptedPayload = encryptClientPayload(payload);
  const ref = await addDoc(collection(db, CLIENTS_COLLECTION), {
    ...encryptedPayload,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Update a client. Only provided fields are updated.
 * @param {string} clientId
 * @param {Partial<import('../schema/clientSchema').Client>} data
 */
export async function updateClient(clientId, data) {
  const ref = doc(db, CLIENTS_COLLECTION, clientId);
  const payload = {};
  const keys = ['clientName', 'institution', 'contactNumber', 'email', 'website', 'address', 'notes', 'imageBase64', 'active', 'timezone'];
  keys.forEach((k) => {
    if (data[k] === undefined) return;
    if (k === 'imageBase64') {
      payload[k] = data[k] != null && data[k] !== '' ? data[k] : '';
    } else if (k === 'active') {
      payload[k] = Boolean(data[k]);
    } else {
      payload[k] = data[k] != null ? String(data[k]).trim() : '';
    }
  });
  if (Object.keys(payload).length === 0) return;
  const encryptedPayload = encryptClientPayload(payload);
  await updateDoc(ref, encryptedPayload);
}

/**
 * Delete a client.
 * @param {string} clientId
 */
export async function deleteClient(clientId) {
  const ref = doc(db, CLIENTS_COLLECTION, clientId);
  await deleteDoc(ref);
}

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
} from 'firebase/firestore';
import { db } from './config';
import { createClientData } from '../schema/clientSchema';

const CLIENTS_COLLECTION = 'clients';

/**
 * Subscribe to all clients (team-wide; real-time).
 * @param {(clients: import('../schema/clientSchema').Client[]) => void} onUpdate
 * @returns {() => void} Unsubscribe function
 */
export function subscribeClients(onUpdate) {
  const q = query(
    collection(db, CLIENTS_COLLECTION),
    orderBy('clientName')
  );
  return onSnapshot(q, (snapshot) => {
    const clients = snapshot.docs.map((d) => ({
      id: d.id,
      ...d.data(),
      createdAt: d.data().createdAt,
    }));
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
  const ref = await addDoc(collection(db, CLIENTS_COLLECTION), {
    ...payload,
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
  const keys = ['clientName', 'institution', 'contactNumber', 'email', 'website', 'address', 'notes', 'imageBase64', 'active'];
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
  await updateDoc(ref, payload);
}

/**
 * Delete a client.
 * @param {string} clientId
 */
export async function deleteClient(clientId) {
  const ref = doc(db, CLIENTS_COLLECTION, clientId);
  await deleteDoc(ref);
}

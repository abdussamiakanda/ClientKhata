/**
 * Firestore Data Schema - 'clients' collection
 *
 * Clients are added separately; jobs/payments reference a client by document id.
 *
 * Document fields:
 * - clientName: (string) Display name – required
 * - institution: (string) Company/organization name
 * - contactNumber: (string) Phone number
 * - email: (string) Email address
 * - website: (string) Website URL
 * - address: (string) Physical address
 * - notes: (string) Free-form notes
 * - imageBase64: (string) Optional profile/logo image as base64 data URL
 * - active: (boolean) If false, client is hidden from "Add job" client dropdown. Default true.
 * - userId: (string) Optional, for audit (who created)
 * - createdAt: (Firestore Timestamp) When created
 */

/**
 * @typedef {Object} Client
 * @property {string} [id] - Document ID (set when read from Firestore) – the identifier
 * @property {string} clientName
 * @property {string} [institution]
 * @property {string} [contactNumber]
 * @property {string} [email]
 * @property {string} [website]
 * @property {string} [address]
 * @property {string} [notes]
 * @property {string} [imageBase64] - Base64 data URL (e.g. data:image/jpeg;base64,...)
 * @property {boolean} [active] - If false, hidden from Add job dropdown. Default true.
 * @property {string} [userId]
 * @property {import('firebase/firestore').Timestamp} [createdAt]
 */

const EMPTY = '';

function str(data, key) {
  const v = data[key];
  return v != null && String(v).trim() !== '' ? String(v).trim() : EMPTY;
}

/**
 * @param {Partial<Client> & { userId?: string }} data
 * @returns {Record<string, unknown>}
 */
export function createClientData(data) {
  const active = data.active === undefined ? true : Boolean(data.active);
  return {
    clientName: str(data, 'clientName') || EMPTY,
    institution: str(data, 'institution'),
    contactNumber: str(data, 'contactNumber'),
    email: str(data, 'email'),
    website: str(data, 'website'),
    address: str(data, 'address'),
    notes: str(data, 'notes'),
    active,
    ...(data.imageBase64 != null && data.imageBase64 !== '' && { imageBase64: data.imageBase64 }),
    ...(data.userId != null && data.userId !== '' && { userId: data.userId }),
  };
}

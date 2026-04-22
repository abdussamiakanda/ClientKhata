import CryptoJS from 'crypto-js';

const ENCRYPTION_PREFIX = 'ENC:';

// Global state to hold the Data Encryption Key (DEK) for the current session.
// This allows firebase API functions to transparently encrypt/decrypt.
let currentEncryptionKey = null;

export function setGlobalEncryptionKey(key) {
  currentEncryptionKey = key;
}

export function getGlobalEncryptionKey() {
  return currentEncryptionKey;
}

export function generateRandomEncryptionKey() {
  const randomWords = CryptoJS.lib.WordArray.random(32); // 256 bits
  return CryptoJS.enc.Base64.stringify(randomWords);
}

export function generateRecoveryKey() {
  return generateRandomEncryptionKey();
}

export function deriveKeyFromPassword(password, salt) {
  const saltWords = CryptoJS.enc.Utf8.parse(salt);
  const key = CryptoJS.PBKDF2(password, saltWords, {
    keySize: 256 / 32,
    iterations: 10000,
  });
  return CryptoJS.enc.Base64.stringify(key);
}

export function encryptData(plaintext, base64Key) {
  if (!plaintext || plaintext.trim() === '') return plaintext; 
  if (plaintext.startsWith(ENCRYPTION_PREFIX)) return plaintext; 
  
  try {
    const key = CryptoJS.enc.Base64.parse(base64Key);
    const iv = CryptoJS.lib.WordArray.random(16); // 128 bit IV
    const encrypted = CryptoJS.AES.encrypt(plaintext, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    // We need to store both IV and Ciphertext! A common pattern is IV:Ciphertext
    const ivBase64 = CryptoJS.enc.Base64.stringify(iv);
    return ENCRYPTION_PREFIX + ivBase64 + ':' + encrypted.toString();
  } catch (err) {
    console.error('Encryption failed', err);
    return plaintext; 
  }
}

export function decryptData(encryptedText, base64Key) {
  if (typeof encryptedText !== 'string' || !encryptedText.startsWith(ENCRYPTION_PREFIX)) {
    return encryptedText; 
  }

  try {
    const withoutPrefix = encryptedText.slice(ENCRYPTION_PREFIX.length);
    const parts = withoutPrefix.split(':');
    if (parts.length !== 2) return encryptedText; // Malformed
    const [ivBase64, ciphertext] = parts;
    const key = CryptoJS.enc.Base64.parse(base64Key);
    const iv = CryptoJS.enc.Base64.parse(ivBase64);

    const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    
    const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
    return plaintext || encryptedText;
  } catch (err) {
    console.error('Decryption failed', err);
    return encryptedText; 
  }
}

export function deriveInvoiceKey(jobId, dek) {
  if (!jobId || !dek) return null;
  const hash = CryptoJS.SHA256(dek + jobId);
  return CryptoJS.enc.Base64.stringify(hash);
}

export function cacheEncryptionKey(uid, key) {
  if (!uid || !key) return;
  try {
    const data = { key, timestamp: Date.now() };
    localStorage.setItem(`clientkhata_vault_key_${uid}`, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to cache encryption key', err);
  }
}

export function getCachedEncryptionKey(uid) {
  if (!uid) return null;
  try {
    const item = localStorage.getItem(`clientkhata_vault_key_${uid}`);
    if (!item) return null;
    const { key, timestamp } = JSON.parse(item);
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    if (Date.now() - timestamp < TWENTY_FOUR_HOURS) {
      return key;
    } else {
      clearCachedEncryptionKey(uid);
      return null;
    }
  } catch (err) {
    console.error('Failed to get cached encryption key', err);
    return null;
  }
}

export function clearCachedEncryptionKey(uid) {
  if (!uid) return;
  try {
    localStorage.removeItem(`clientkhata_vault_key_${uid}`);
  } catch (err) {
    console.error('Failed to clear cached encryption key', err);
  }
}

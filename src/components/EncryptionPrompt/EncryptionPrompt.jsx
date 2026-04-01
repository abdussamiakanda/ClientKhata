import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { generateRandomEncryptionKey, deriveKeyFromPassword, encryptData, decryptData, cacheEncryptionKey } from '../../utils/encryption';
import { saveUserProfile } from '../../firebase/profile';
import { migrateUnencryptedData } from '../../firebase/migration';
import '../Auth/Auth.css';
import './EncryptionPrompt.css';

export function EncryptionPrompt({ user, profile, onUnlock }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const isSetup = !profile?.encryptionSetup || !profile?.encryptedDataKey;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!password.trim()) {
      setError('Password is required');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      if (isSetup) {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }

        // 1. Generate new Data Encryption Key (DEK)
        const dek = generateRandomEncryptionKey();
        
        // 2. Derive Key-Encryption-Key (KEK) from password and UID
        const kek = deriveKeyFromPassword(password, user.uid);
        
        // 3. Encrypt the DEK with the KEK
        const encryptedDek = encryptData(dek, kek);
        
        // 4. Save to profile
        await saveUserProfile(user.uid, {
          encryptionSetup: true,
          encryptedDataKey: encryptedDek
        });
        
        // 5. Unlock app
        cacheEncryptionKey(user.uid, dek);
        onUnlock(dek);

        // 6. Migrate any existing unencrypted data into ciphertext (Runs in background)
        migrateUnencryptedData(user.uid).catch(err => {
          console.error('Migration failed in background:', err);
        });
      } else {
        // Unlock existing
        const kek = deriveKeyFromPassword(password, user.uid);
        const dek = decryptData(profile.encryptedDataKey, kek);
        
        if (!dek || dek === profile.encryptedDataKey) {
          throw new Error('Incorrect password');
        }
        
        cacheEncryptionKey(user.uid, dek);
        onUnlock(dek);

        // Always run a background migration sweep just in case schema added new fields
        migrateUnencryptedData(user.uid).catch(err => {
          console.error('Migration failed in background:', err);
        });
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to unlock data');
    } finally {
      if (typeof window !== 'undefined') {
        setTimeout(() => setLoading(false), 300); // Artificial minimum delay for UX
      } else {
        setLoading(false);
      }
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-page__bg" aria-hidden="true">
        <div className="auth-page__grid" />
        <div className="auth-page__glow auth-page__glow--1" />
        <div className="auth-page__glow auth-page__glow--2" />
      </div>

      <div className="auth-card">
        <div className="auth-card__inner">
          <h2 className="auth-title">
            {isSetup ? 'Secure Your Data' : 'Unlock Your Vault'}
          </h2>
          <p className="auth-subtitle">
            {isSetup 
              ? 'Create a Master Recovery Password. This password will encrypt all your client data so only you can read it.'
              : 'Enter your Master Recovery Password to decrypt your client data.'}
          </p>
          
          <form className="auth-form" onSubmit={handleSubmit}>
            {error && (
              <div className="auth-error" role="alert">
                {error}
              </div>
            )}
            
            <div className="auth-label">
              <label htmlFor="enc-password">Master Password</label>
              <input
                id="enc-password"
                className="auth-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="new-password"
                required
                autoFocus
              />
            </div>
            
            {isSetup && (
              <div className="auth-label">
                <label htmlFor="enc-confirm">Confirm Password</label>
                <input
                  id="enc-confirm"
                  className="auth-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  required
                />
              </div>
            )}
            
            {isSetup && (
              <div className="encryption-warning">
                <div className="encryption-warning-header">
                  <ShieldAlert size={16} />
                  <span>Warning: Never forget this!</span>
                </div>
                <span>Because your data is end-to-end encrypted, we cannot recover your data if you lose this password.</span>
              </div>
            )}
            
            <button 
              type="submit" 
              className="auth-button"
              disabled={loading}
            >
              {loading ? (
                <span className="auth-button__loading">
                  <span className="auth-button__spinner" aria-hidden="true" />
                  {isSetup ? 'Securing...' : 'Unlocking...'}
                </span>
              ) : (
                isSetup ? 'Setup Encryption' : 'Unlock Data'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

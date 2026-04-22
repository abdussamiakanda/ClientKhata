import { useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import {
  generateRandomEncryptionKey,
  generateRecoveryKey,
  deriveKeyFromPassword,
  encryptData,
  decryptData,
  cacheEncryptionKey,
  clearCachedEncryptionKey,
  setGlobalEncryptionKey
} from '../../utils/encryption';
import { saveUserProfile } from '../../firebase/profile';
import { migrateUnencryptedData, resetEncryptedVault } from '../../firebase/migration';
import '../Auth/Auth.css';
import './EncryptionPrompt.css';

export function EncryptionPrompt({ user, profile, onUnlock }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [unlockMode, setUnlockMode] = useState('password');
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [generatedRecoveryKey, setGeneratedRecoveryKey] = useState('');
  const [pendingDek, setPendingDek] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const isSetup = !profile?.encryptionSetup || !profile?.encryptedDataKey;
  const canRecoverWithKey = !isSetup && Boolean(profile?.encryptedDataKeyByRecovery);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isSetup) {
      if (unlockMode === 'recovery') {
        if (!recoveryKey.trim()) {
          setError('Recovery key is required');
          return;
        }
      } else if (!password.trim()) {
        setError('Password is required');
        return;
      }
    } else if (!password.trim()) {
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
        const newRecoveryKey = generateRecoveryKey();
        
        // 2. Derive Key-Encryption-Key (KEK) from password and UID
        const kek = deriveKeyFromPassword(password, user.uid);
        
        // 3. Encrypt the DEK with both KEK and recovery key
        const encryptedDek = encryptData(dek, kek);
        const encryptedDekByRecovery = encryptData(dek, newRecoveryKey);
        
        // 4. Save to profile
        await saveUserProfile(user.uid, {
          encryptionSetup: true,
          recoverySetup: true,
          encryptedDataKey: encryptedDek,
          encryptedDataKeyByRecovery: encryptedDekByRecovery
        });

        // Show one-time recovery key before unlocking the app.
        setGeneratedRecoveryKey(newRecoveryKey);
        setPendingDek(dek);
        return;
      } else {
        // Unlock existing
        let dek;
        if (unlockMode === 'recovery') {
          if (!profile?.encryptedDataKeyByRecovery) {
            throw new Error('Recovery key is not available for this vault');
          }
          dek = decryptData(profile.encryptedDataKeyByRecovery, recoveryKey.trim());
        } else {
          const kek = deriveKeyFromPassword(password, user.uid);
          dek = decryptData(profile.encryptedDataKey, kek);
        }
        
        if (!dek || dek === profile.encryptedDataKey || dek === profile.encryptedDataKeyByRecovery) {
          throw new Error(unlockMode === 'recovery' ? 'Invalid recovery key' : 'Incorrect password');
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

  async function handleResetVault() {
    if (resetConfirmText.trim().toUpperCase() !== 'RESET') {
      setError('Type RESET to confirm vault reset');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await resetEncryptedVault(user.uid);
      clearCachedEncryptionKey(user.uid);
      setGlobalEncryptionKey(null);
      setPassword('');
      setConfirmPassword('');
      setRecoveryKey('');
      setUnlockMode('password');
      setResetConfirmText('');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to reset vault');
    } finally {
      setLoading(false);
    }
  }

  function handleContinueAfterSetup() {
    if (!pendingDek) return;
    cacheEncryptionKey(user.uid, pendingDek);
    onUnlock(pendingDek);
    migrateUnencryptedData(user.uid).catch(err => {
      console.error('Migration failed in background:', err);
    });
    setGeneratedRecoveryKey('');
    setPendingDek(null);
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
          {generatedRecoveryKey ? (
            <div className="auth-form">
              <h2 className="auth-title">Save Your Recovery Key</h2>
              <p className="auth-subtitle">
                Store this key now. Use it to recover vault access when needed. This key is shown only once.
              </p>
              <div className="encryption-warning">
                <div className="encryption-warning-header">
                  <ShieldAlert size={16} />
                  <span>One-time Recovery Key</span>
                </div>
                <code className="recovery-key-value">{generatedRecoveryKey}</code>
              </div>
              <button
                type="button"
                className="auth-button"
                onClick={handleContinueAfterSetup}
              >
                I saved this key, continue
              </button>
            </div>
          ) : (
            <>
              <h2 className="auth-title">
                {isSetup ? 'Secure Your Data' : 'Unlock Your Vault'}
              </h2>
              <p className="auth-subtitle">
                {isSetup
                  ? 'Create a Master Recovery Password. This password will encrypt all your client data so only you can read it.'
                  : 'Enter your Master Recovery Password to decrypt your client data.'}
              </p>

              {unlockMode === 'reset' && !isSetup ? (
                <div className="auth-form">
                  {error && (
                    <div className="auth-error" role="alert">
                      {error}
                    </div>
                  )}
                  <div className="encryption-warning">
                    <div className="encryption-warning-header">
                      <ShieldAlert size={16} />
                      <span>Destructive action</span>
                    </div>
                    <span>This will permanently delete all clients, jobs, payment records, and encrypted vault keys.</span>
                    <span>Type <strong>RESET</strong> to confirm.</span>
                  </div>
                  <input
                    className="auth-input"
                    type="text"
                    value={resetConfirmText}
                    onChange={(e) => setResetConfirmText(e.target.value)}
                    placeholder="Type RESET"
                    autoComplete="off"
                  />
                  <button type="button" className="auth-button" disabled={loading} onClick={handleResetVault}>
                    {loading ? 'Resetting...' : 'Reset Vault'}
                  </button>
                  <button
                    type="button"
                    className="auth-link-button"
                    onClick={() => {
                      setError('');
                      setUnlockMode(canRecoverWithKey ? 'recovery' : 'password');
                    }}
                  >
                    Go back
                  </button>
                </div>
              ) : (
                <form className="auth-form" onSubmit={handleSubmit}>
                  {error && (
                    <div className="auth-error" role="alert">
                      {error}
                    </div>
                  )}

                  <div className="auth-label">
                    <label htmlFor="enc-password">
                      {unlockMode === 'recovery' && !isSetup ? 'Recovery Key' : 'Master Password'}
                    </label>
                    <input
                      id="enc-password"
                      className="auth-input"
                      type={unlockMode === 'recovery' && !isSetup ? 'text' : 'password'}
                      value={unlockMode === 'recovery' && !isSetup ? recoveryKey : password}
                      onChange={(e) => {
                        if (unlockMode === 'recovery' && !isSetup) {
                          setRecoveryKey(e.target.value);
                        } else {
                          setPassword(e.target.value);
                        }
                      }}
                      placeholder={unlockMode === 'recovery' && !isSetup ? 'Paste your recovery key' : 'Enter your password'}
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
                      <span>You will also get a one-time recovery key after setup. Store both credentials safely.</span>
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
                      isSetup ? 'Setup Encryption' : (unlockMode === 'recovery' ? 'Unlock with Recovery Key' : 'Unlock Data')
                    )}
                  </button>

                  {!isSetup && unlockMode === 'password' && (
                    <button
                      type="button"
                      className="auth-link-button"
                      onClick={() => {
                        setError('');
                        setUnlockMode(canRecoverWithKey ? 'recovery' : 'reset');
                      }}
                    >
                      Forgot password?
                    </button>
                  )}

                  {!isSetup && unlockMode === 'recovery' && (
                    <div className="auth-recovery-actions">
                      <button
                        type="button"
                        className="auth-link-button"
                        onClick={() => {
                          setError('');
                          setUnlockMode('password');
                        }}
                      >
                        Back to master password
                      </button>
                      <button
                        type="button"
                        className="auth-link-button auth-link-button--danger"
                        onClick={() => {
                          setError('');
                          setUnlockMode('reset');
                        }}
                      >
                        Reset Vault instead
                      </button>
                    </div>
                  )}
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

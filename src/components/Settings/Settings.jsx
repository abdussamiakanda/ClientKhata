import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { saveUserProfile } from '../../firebase/profile';
import { ArrowLeft, Sun, Moon, Palette, LayoutGrid, Building2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { deriveKeyFromPassword, encryptData, decryptData, cacheEncryptionKey, generateRecoveryKey } from '../../utils/encryption';
import { resolveBackLink } from '../../utils/navBack';
import './Settings.css';

const PAID_COLUMN_OPTIONS = [
  { value: 0, label: 'All' },
  { value: 1, label: '1 day' },
  { value: 2, label: '2 days' },
  { value: 3, label: '3 days' },
  { value: 7, label: '1 week' },
  { value: 14, label: '2 weeks' },
  { value: 30, label: '1 month' },
  { value: 60, label: '2 months' },
];

export function Settings() {
  const location = useLocation();
  const back = resolveBackLink(location, { pathname: '/dashboard', label: 'Home' });
  const { theme, setTheme } = useTheme();
  const { settings, setPaidColumnCutoffDays } = useSettings();
  const { user, profile } = useAuth();

  const [profileForm, setProfileForm] = useState({
    businessName: '',
    phone: '',
    email: '',
    address: '',
    timezone: '',
  });
  
  const timezones = useMemo(() => {
    try {
      return Intl.supportedValuesOf('timeZone');
    } catch (e) {
      return [Intl.DateTimeFormat().resolvedOptions().timeZone];
    }
  }, []);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');

  const [pwdForm, setPwdForm] = useState({ oldPwd: '', newPwd: '', confirmPwd: '' });
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMessage, setPwdMessage] = useState({ text: '', type: '' });
  const [recoveryForm, setRecoveryForm] = useState({ currentPwd: '' });
  const [savingRecovery, setSavingRecovery] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState({ text: '', type: '' });
  const [latestRecoveryKey, setLatestRecoveryKey] = useState('');

  useEffect(() => {
    if (profile) {
      setProfileForm({
        businessName: profile.businessName || '',
        phone: profile.phone || '',
        email: profile.email || '',
        address: profile.address || '',
        timezone: profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    }
  }, [profile]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSavingProfile(true);
    setProfileSuccess('');
    try {
      await saveUserProfile(user.uid, profileForm);
      setProfileSuccess('Profile saved successfully!');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!user || !profile || !profile.encryptedDataKey) return;
    
    if (pwdForm.newPwd !== pwdForm.confirmPwd) {
      setPwdMessage({ text: 'New passwords do not match', type: 'error' });
      return;
    }
    if (pwdForm.newPwd.length < 6) {
      setPwdMessage({ text: 'Password must be at least 6 characters', type: 'error' });
      return;
    }
    
    setSavingPwd(true);
    setPwdMessage({ text: '', type: '' });
    
    try {
      // 1. Decrypt Data Encryption Key (DEK) with old password derived Key Encryption Key (KEK)
      const oldKek = deriveKeyFromPassword(pwdForm.oldPwd, user.uid);
      const dek = decryptData(profile.encryptedDataKey, oldKek);
      
      if (!dek || dek === profile.encryptedDataKey) {
        throw new Error('Incorrect current password');
      }
      
      // 2. Encrypt DEK with new password derived KEK
      const newKek = deriveKeyFromPassword(pwdForm.newPwd, user.uid);
      const newEncryptedDek = encryptData(dek, newKek);
      
      // 3. Save new encrypted DEK to profile
      await saveUserProfile(user.uid, { encryptedDataKey: newEncryptedDek });
      
      // Refresh DEK cache timeout
      cacheEncryptionKey(user.uid, dek);
      
      setPwdMessage({ text: 'Master password updated successfully!', type: 'success' });
      setPwdForm({ oldPwd: '', newPwd: '', confirmPwd: '' });
      setTimeout(() => setPwdMessage({ text: '', type: '' }), 5000);
    } catch (err) {
      console.error(err);
      setPwdMessage({ text: err.message || 'Failed to update password', type: 'error' });
    } finally {
      setSavingPwd(false);
    }
  };

  const handleRegenerateRecoveryKey = async (e) => {
    e.preventDefault();
    if (!user || !profile || !profile.encryptedDataKey) return;
    if (!recoveryForm.currentPwd.trim()) {
      setRecoveryMessage({ text: 'Current password is required', type: 'error' });
      return;
    }

    setSavingRecovery(true);
    setRecoveryMessage({ text: '', type: '' });
    setLatestRecoveryKey('');

    try {
      const currentKek = deriveKeyFromPassword(recoveryForm.currentPwd, user.uid);
      const dek = decryptData(profile.encryptedDataKey, currentKek);
      if (!dek || dek === profile.encryptedDataKey) {
        throw new Error('Incorrect current password');
      }

      const newRecoveryKey = generateRecoveryKey();
      const encryptedDataKeyByRecovery = encryptData(dek, newRecoveryKey);

      await saveUserProfile(user.uid, {
        recoverySetup: true,
        encryptedDataKeyByRecovery
      });

      cacheEncryptionKey(user.uid, dek);
      setLatestRecoveryKey(newRecoveryKey);
      setRecoveryForm({ currentPwd: '' });
      setRecoveryMessage({ text: 'Recovery key regenerated. Save it now; this key is shown only once.', type: 'success' });
    } catch (err) {
      console.error(err);
      setRecoveryMessage({ text: err.message || 'Failed to regenerate recovery key', type: 'error' });
    } finally {
      setSavingRecovery(false);
    }
  };

  return (
    <div className="page settings-page">
      <div className="page-header settings-page__header">
        <Link to={back.to} className="btn btn-secondary">
          <ArrowLeft size={18} />
          Back to {back.label}
        </Link>
        <h1 className="page-title">Settings</h1>
      </div>

      <section className="settings-card" aria-labelledby="settings-appearance-title">
        <h2 id="settings-appearance-title" className="settings-card__title">
          <Palette size={20} aria-hidden />
          Appearance
        </h2>
        <div className="settings-card__body">
          <span className="settings-card__label">Theme</span>
          <div className="settings-card__theme-options" role="radiogroup" aria-label="Theme">
            <label className={`settings-card__theme-option ${theme === 'light' ? 'settings-card__theme-option--active' : ''}`}>
              <input
                type="radio"
                name="theme"
                value="light"
                checked={theme === 'light'}
                onChange={() => setTheme('light')}
                className="settings-card__theme-input"
              />
              <span className="settings-card__theme-box">
                <Sun size={20} className="settings-card__theme-icon" aria-hidden />
                Light
              </span>
            </label>
            <label className={`settings-card__theme-option ${theme === 'dark' ? 'settings-card__theme-option--active' : ''}`}>
              <input
                type="radio"
                name="theme"
                value="dark"
                checked={theme === 'dark'}
                onChange={() => setTheme('dark')}
                className="settings-card__theme-input"
              />
              <span className="settings-card__theme-box">
                <Moon size={20} className="settings-card__theme-icon" aria-hidden />
                Dark
              </span>
            </label>
          </div>
        </div>
      </section>

      <section className="settings-card" aria-labelledby="settings-jobs-title">
        <h2 id="settings-jobs-title" className="settings-card__title">
          <LayoutGrid size={20} aria-hidden />
          Jobs board
        </h2>
        <div className="settings-card__body">
          <label htmlFor="paid-column-cutoff" className="settings-card__label">
            Paid column: show jobs paid within
          </label>
          <select
            id="paid-column-cutoff"
            value={settings.paidColumnCutoffDays}
            onChange={(e) => setPaidColumnCutoffDays(Number(e.target.value))}
            className="settings-card__select"
            aria-label="Paid column cutoff"
          >
            {PAID_COLUMN_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="settings-card" aria-labelledby="settings-profile-title">
        <h2 id="settings-profile-title" className="settings-card__title">
          <Building2 size={20} aria-hidden />
          Business Profile
        </h2>
        <form className="settings-card__body settings-card__body--form" onSubmit={handleProfileSubmit}>
          <div className="settings-form-grid">
            <div className="settings-form-group full-width">
              <label htmlFor="pf-name" className="settings-card__label">Business / Your Name</label>
              <input
                id="pf-name"
                className="input"
                value={profileForm.businessName}
                onChange={(e) => setProfileForm(p => ({ ...p, businessName: e.target.value }))}
                placeholder="e.g. Acme Innovations"
              />
            </div>
            <div className="settings-form-group">
              <label htmlFor="pf-email" className="settings-card__label">Email Address</label>
              <input
                id="pf-email"
                type="email"
                className="input"
                value={profileForm.email}
                onChange={(e) => setProfileForm(p => ({ ...p, email: e.target.value }))}
                placeholder="e.g. hello@example.com"
              />
            </div>
            <div className="settings-form-group">
              <label htmlFor="pf-phone" className="settings-card__label">Phone Number</label>
              <input
                id="pf-phone"
                className="input"
                value={profileForm.phone}
                onChange={(e) => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                placeholder="e.g. +1 234 567 890"
              />
            </div>
            <div className="settings-form-group full-width">
              <label htmlFor="pf-address" className="settings-card__label">Full Address</label>
              <textarea
                id="pf-address"
                className="input"
                rows="3"
                value={profileForm.address}
                onChange={(e) => setProfileForm(p => ({ ...p, address: e.target.value }))}
                placeholder="e.g. 123 Main St, City, Country"
              />
            </div>
            <div className="settings-form-group full-width">
              <label htmlFor="pf-timezone" className="settings-card__label">Timezone</label>
              <select
                id="pf-timezone"
                className="input"
                value={profileForm.timezone}
                onChange={(e) => setProfileForm(p => ({ ...p, timezone: e.target.value }))}
              >
                <option value="">Default (Browser)</option>
                {timezones.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="settings-form-actions">
            <button type="submit" className="btn-premium" disabled={savingProfile}>
              {savingProfile ? 'Saving...' : 'Save Profile'}
            </button>
            {profileSuccess && (
              <span className="profile-success-msg">
                <CheckCircle2 size={16} />
                {profileSuccess}
              </span>
            )}
          </div>
        </form>
      </section>

      <section className="settings-card" aria-labelledby="settings-security-title">
        <h2 id="settings-security-title" className="settings-card__title">
          <ShieldAlert size={20} aria-hidden />
          Security Vault
        </h2>
        <form className="settings-card__body settings-card__body--form" onSubmit={handlePasswordChange}>
          <p className="settings-form-desc">
            Change your Master Recovery Password. This updates how your internal data key is encrypted. You will not lose any client data by changing this.
          </p>
          <div className="settings-form-grid">
            <div className="settings-form-group full-width">
              <label htmlFor="pwd-old" className="settings-card__label">Current Password</label>
              <input
                id="pwd-old"
                type="password"
                className="input"
                value={pwdForm.oldPwd}
                onChange={(e) => setPwdForm(p => ({ ...p, oldPwd: e.target.value }))}
                placeholder="Enter current password"
                required
              />
            </div>
            <div className="settings-form-group">
              <label htmlFor="pwd-new" className="settings-card__label">New Password</label>
              <input
                id="pwd-new"
                type="password"
                className="input"
                value={pwdForm.newPwd}
                onChange={(e) => setPwdForm(p => ({ ...p, newPwd: e.target.value }))}
                placeholder="At least 6 characters"
                required
              />
            </div>
            <div className="settings-form-group">
              <label htmlFor="pwd-confirm" className="settings-card__label">Confirm New Password</label>
              <input
                id="pwd-confirm"
                type="password"
                className="input"
                value={pwdForm.confirmPwd}
                onChange={(e) => setPwdForm(p => ({ ...p, confirmPwd: e.target.value }))}
                placeholder="Match new password"
                required
              />
            </div>
          </div>
          
          <div className="settings-form-actions">
            <button type="submit" className="btn-premium" disabled={savingPwd}>
              {savingPwd ? 'Updating...' : 'Change Password'}
            </button>
            {pwdMessage.text && (
              <span className={`profile-msg ${pwdMessage.type === 'error' ? 'profile-msg--error' : 'profile-success-msg'}`}>
                {pwdMessage.type === 'success' && <CheckCircle2 size={16} />}
                {pwdMessage.text}
              </span>
            )}
          </div>
        </form>
        <form className="settings-card__body settings-card__body--form" onSubmit={handleRegenerateRecoveryKey}>
          <p className="settings-form-desc">
            Regenerate your one-time recovery key. You must provide your current master password to confirm.
          </p>
          <div className="settings-form-grid">
            <div className="settings-form-group full-width">
              <label htmlFor="recovery-current" className="settings-card__label">Current Password</label>
              <input
                id="recovery-current"
                type="password"
                className="input"
                value={recoveryForm.currentPwd}
                onChange={(e) => setRecoveryForm({ currentPwd: e.target.value })}
                placeholder="Enter current password"
                required
              />
            </div>
          </div>
          <div className="settings-form-actions">
            <button type="submit" className="btn-premium" disabled={savingRecovery}>
              {savingRecovery ? 'Generating...' : 'Regenerate Recovery Key'}
            </button>
          </div>
          {recoveryMessage.text && (
            <span className={`profile-msg ${recoveryMessage.type === 'error' ? 'profile-msg--error' : 'profile-success-msg'}`}>
              {recoveryMessage.type === 'success' && <CheckCircle2 size={16} />}
              {recoveryMessage.text}
            </span>
          )}
          {latestRecoveryKey && (
            <div className="encryption-warning">
              <div className="encryption-warning-header">
                <ShieldAlert size={16} />
                <span>New Recovery Key</span>
              </div>
              <code className="recovery-key-value">{latestRecoveryKey}</code>
            </div>
          )}
        </form>
      </section>
    </div>
  );
}

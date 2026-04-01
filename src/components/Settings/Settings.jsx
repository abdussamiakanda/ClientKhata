import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { saveUserProfile } from '../../firebase/profile';
import { ArrowLeft, Sun, Moon, Palette, LayoutGrid, Building2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { deriveKeyFromPassword, encryptData, decryptData, cacheEncryptionKey } from '../../utils/encryption';
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
  const { theme, setTheme } = useTheme();
  const { settings, setPaidColumnCutoffDays } = useSettings();
  const { user, profile } = useAuth();

  const [profileForm, setProfileForm] = useState({
    businessName: '',
    phone: '',
    email: '',
    address: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');

  const [pwdForm, setPwdForm] = useState({ oldPwd: '', newPwd: '', confirmPwd: '' });
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdMessage, setPwdMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        businessName: profile.businessName || '',
        phone: profile.phone || '',
        email: profile.email || '',
        address: profile.address || '',
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

  return (
    <div className="page settings-page">
      <div className="page-header settings-page__header">
        <Link to="/dashboard" className="btn btn-secondary">
          <ArrowLeft size={18} />
          Back to Dashboard
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
      </section>
    </div>
  );
}

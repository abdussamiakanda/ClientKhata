import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';
import { saveUserProfile } from '../../firebase/profile';
import { ArrowLeft, Sun, Moon, Palette, LayoutGrid, Building2, CheckCircle2 } from 'lucide-react';
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
            <div className="settings-form-group">
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
    </div>
  );
}

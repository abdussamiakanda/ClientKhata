import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import './Settings.css';

export function Settings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="settings-page">
      <div className="settings-header">
        <Link to="/dashboard" className="settings-back">
          ← Back to Dashboard
        </Link>
        <h1 className="settings-title">Settings</h1>
      </div>

      <section className="settings-section">
        <h2 className="settings-section__title">Appearance</h2>
        <div className="settings-theme">
          <span className="settings-theme__label">Theme</span>
          <div className="settings-theme__options" role="radiogroup" aria-label="Theme">
            <label className={`settings-theme__option ${theme === 'light' ? 'settings-theme__option--active' : ''}`}>
              <input
                type="radio"
                name="theme"
                value="light"
                checked={theme === 'light'}
                onChange={() => setTheme('light')}
                className="settings-theme__input"
              />
              <span className="settings-theme__box">
                <Sun size={20} className="settings-theme__icon" aria-hidden="true" />
                Light
              </span>
            </label>
            <label className={`settings-theme__option ${theme === 'dark' ? 'settings-theme__option--active' : ''}`}>
              <input
                type="radio"
                name="theme"
                value="dark"
                checked={theme === 'dark'}
                onChange={() => setTheme('dark')}
                className="settings-theme__input"
              />
              <span className="settings-theme__box">
                <Moon size={20} className="settings-theme__icon" aria-hidden="true" />
                Dark
              </span>
            </label>
          </div>
        </div>
      </section>
    </div>
  );
}

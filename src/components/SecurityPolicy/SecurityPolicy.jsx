import { Link } from 'react-router-dom';
import { Shield, Lock, EyeOff, Key, ArrowLeft, ExternalLink } from 'lucide-react';
import { BrandIcon } from '../BrandIcon';
import './SecurityPolicy.css';

export function SecurityPolicy() {
  return (
    <div className="policy-page">
      <div className="policy-container">
        <header className="policy-header">
          <Link to="/" className="policy-back">
            <ArrowLeft size={16} />
            Back to Home
          </Link>
          <div className="policy-brand-container">
            <div className="policy-brand">
              <BrandIcon size={32} />
              <span className="policy-brand-text">ClientKhata</span>
            </div>
            <h1 className="policy-title">Privacy & Security</h1>
          </div>
          <p className="policy-subtitle">
            Your trust is our most valuable asset. Here's how we protect your data.
          </p>
        </header>

        <main className="policy-content">
          <section className="policy-section">
            <div className="policy-section__icon">
              <Shield size={24} />
            </div>
            <h2>Zero-Knowledge Architecture</h2>
            <p>
              ClientKhata is built on a "Zero-Knowledge" principle. This means we have zero access to your sensitive 
              business data. Your client names, project descriptions, and payment amounts are encrypted 
              before they ever leave your browser.
            </p>
          </section>

          <section className="policy-section">
            <div className="policy-section__icon">
              <Lock size={24} />
            </div>
            <h2>End-to-End Encryption (E2EE)</h2>
            <p>
              We use <strong>AES-256-CBC</strong> encryption, a bank-grade standard, to secure your information. 
              The encryption process uses a <strong>Master Password</strong> that only you know. This password 
              is used to derive a local encryption key on your device.
            </p>
            <ul className="policy-list">
              <li><strong>Local Encryption:</strong> Data is turned into gibberish on your device.</li>
              <li><strong>Secure Transfer:</strong> Only the encrypted "gibberish" is sent to our servers.</li>
              <li><strong>Unique Keys:</strong> Every user has a unique encryption signature derived from their password.</li>
            </ul>
          </section>

          <section className="policy-section warning">
            <div className="policy-section__icon">
              <Key size={24} />
            </div>
            <h2>The Master Password</h2>
            <p>
              Because of our security model, <strong>we cannot recover your Master Password</strong> if you forget it. 
              We don't store it, and we don't have a "backdoor" to your data.
            </p>
            <div className="policy-alert">
              <strong>Important:</strong> If you lose your Master Password, your encrypted client data will be 
              permanently unreadable, even to us. Please keep it in a safe place (like a password manager).
            </div>
          </section>

          <section className="policy-section">
            <div className="policy-section__icon">
              <EyeOff size={24} />
            </div>
            <h2>Your Privacy</h2>
            <p>
              We believe your business is your business. 
            </p>
            <ul className="policy-list">
              <li><strong>No Data Selling:</strong> We never sell, rent, or share your data with third parties.</li>
              <li><strong>No Tracking:</strong> We don't use invasive trackers or sell your behavior to advertisers.</li>
              <li><strong>Open Communication:</strong> We are committed to transparency about how our system works.</li>
            </ul>
          </section>

          <section className="policy-section">
            <h2>Terms of Service</h2>
            <p>
              By using ClientKhata, you agree to:
            </p>
            <ul className="policy-list">
              <li>Use the service for lawful business purposes.</li>
              <li>Maintain the security of your account and master password.</li>
              <li>Understand that while we take every precaution, no system is 100% secure.</li>
            </ul>
          </section>
        </main>

        <footer className="policy-footer">
          <p>© {new Date().getFullYear()} ClientKhata. Built for freelancers, by freelancers.</p>
          <div className="policy-footer-links">
             <a href="mailto:abdussamiakanda@gmail.com" className="policy-footer-link">
               Contact Support <ExternalLink size={12} />
             </a>
          </div>
        </footer>
      </div>
    </div>
  );
}

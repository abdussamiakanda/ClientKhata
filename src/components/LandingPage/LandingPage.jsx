import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BrandIcon } from '../BrandIcon';
import { Briefcase, Users, Banknote, LayoutDashboard, ArrowRight } from 'lucide-react';
import './LandingPage.css';

export function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="landing">
      <header className="landing-header">
        <div className="landing-header__inner">
          <Link to="/" className="landing-logo">
            <BrandIcon size={32} className="landing-logo__icon" />
            <span>ClientKhata</span>
          </Link>
          <div className="landing-header__actions">
            {user ? (
              <Link to="/dashboard" className="btn btn-primary">
                <LayoutDashboard size={18} />
                Dashboard
              </Link>
            ) : (
              <Link to="/login" className="btn btn-primary">
                Log in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="landing-main">
        <section className="landing-hero">
          <h1 className="landing-hero__title">
            Track clients, jobs & payments <strong>in one place</strong>
          </h1>
          <p className="landing-hero__subtitle">
            ClientKhata helps you manage client work from pending to paid. Add clients, create jobs, record payments, and keep everything in sync.
          </p>
          {!user && (
            <Link to="/login" className="btn btn-primary landing-hero__cta">
              Get started with Google
              <ArrowRight size={18} />
            </Link>
          )}
        </section>

        <section className="landing-features">
          <h2 className="landing-features__title">What you can do</h2>
          <ul className="landing-features__list">
            <li className="landing-feature">
              <span className="landing-feature__icon">
                <Users size={28} />
              </span>
              <div>
                <h3 className="landing-feature__name">Clients</h3>
                <p className="landing-feature__desc">Add and manage clients with contact details and notes.</p>
              </div>
            </li>
            <li className="landing-feature">
              <span className="landing-feature__icon">
                <Briefcase size={28} />
              </span>
              <div>
                <h3 className="landing-feature__name">Jobs & status</h3>
                <p className="landing-feature__desc">Create jobs per client and move them through Pending → Ongoing → Delivered → Paid.</p>
              </div>
            </li>
            <li className="landing-feature">
              <span className="landing-feature__icon">
                <Banknote size={28} />
              </span>
              <div>
                <h3 className="landing-feature__name">Payments</h3>
                <p className="landing-feature__desc">Record partial or full payments per job. Multiple currencies supported.</p>
              </div>
            </li>
          </ul>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer__inner">
          <span className="landing-footer__copy">© {new Date().getFullYear()} ClientKhata</span>
          <span className="landing-footer__version">|</span>
          <span className="landing-footer__dev-name">
            Developed by{' '}
            <a href="https://abdussamiakanda.com" target="_blank" rel="noopener noreferrer" className="landing-footer__link">
              Md Abdus Sami Akanda
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}

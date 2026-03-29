import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { BrandIcon } from '../BrandIcon';
import { 
  Briefcase, 
  Users, 
  Banknote, 
  LayoutDashboard, 
  ArrowRight,
  CheckCircle,
  Zap,
  BarChart3,
  FileText
} from 'lucide-react';
import './LandingPage.css';

export function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="landing">
      {/* Background Orbs */}
      <div className="landing-bg-elements">
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
      </div>

      <header className="landing-header">
        <div className="landing-header__inner">
          <Link to="/" className="landing-logo">
            <BrandIcon size={32} className="landing-logo__icon" />
            <span>ClientKhata</span>
          </Link>
          
          <div className="landing-header__actions">
            {user ? (
              <Link to="/dashboard" className="btn btn-primary btn-nav">
                <LayoutDashboard size={18} />
                Dashboard
              </Link>
            ) : (
              <Link to="/login" className="btn btn-primary btn-nav">
                Log in
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="landing-main">
        {/* HERO SECTION */}
        <section className="landing-hero">
          <div className="landing-hero__content">
            <div className="landing-hero__badge">
              <Zap size={14}/><span>The smarter way to manage freelance work</span>
            </div>
            
            <h1 className="landing-hero__title">
              Track clients, jobs & payments <strong>in one place</strong>
            </h1>
            
            <p className="landing-hero__subtitle">
              ClientKhata helps you manage client work from pending to paid. Stop chasing invoices and start focusing on the work that matters.
            </p>
            
            <div className="landing-hero__actions">
              {!user ? (
                <Link to="/login" className="btn btn-primary btn-lg landing-hero__cta">
                  Start for free <ArrowRight size={18} />
                </Link>
              ) : (
                <Link to="/dashboard" className="btn btn-primary btn-lg landing-hero__cta">
                  Go to Dashboard <ArrowRight size={18} />
                </Link>
              )}
            </div>
            
            <div className="landing-hero__stats">
              <div className="stat">
                <strong>100%</strong> Cloud Synced
              </div>
              <div className="stat-divider"></div>
              <div className="stat">
                <strong>0</strong> Monthly Fees
              </div>
            </div>
          </div>
          
          {/* DASHBOARD VISUAL (CSS Only) */}
          <div className="landing-hero__visual">
            <div className="mock-dashboard">
              <div className="mock-dash-header">
                <div className="mock-mock-logo"></div>
                <div className="mock-user"></div>
              </div>
              <div className="mock-dash-content">
                <div className="mock-sidebar">
                  <div className="mock-nav-item active"></div>
                  <div className="mock-nav-item"></div>
                  <div className="mock-nav-item"></div>
                </div>
                <div className="mock-main">
                  <div className="mock-metric-cards">
                    <div className="mock-card card-accent-1">
                      <div className="mock-icon"><Briefcase size={16}/></div>
                      <div className="mock-bars">
                        <div className="mock-bar w-50"></div>
                        <div className="mock-bar w-30"></div>
                      </div>
                    </div>
                    <div className="mock-card card-accent-2">
                      <div className="mock-icon"><Banknote size={16}/></div>
                      <div className="mock-bars">
                         <div className="mock-bar w-70"></div>
                         <div className="mock-bar w-40"></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mock-list-area">
                    <div className="mock-list-header">
                      <div className="mock-bar w-40 h-lg"></div>
                      <div className="mock-pill"></div>
                    </div>
                    <div className="mock-list-items">
                      <div className="mock-list-item">
                        <div className="mock-avatar"></div>
                        <div className="mock-details">
                          <div className="mock-bar w-60"></div>
                          <div className="mock-bar w-30 thin"></div>
                        </div>
                        <div className="mock-amount"></div>
                      </div>
                      <div className="mock-list-item">
                        <div className="mock-avatar"></div>
                        <div className="mock-details">
                          <div className="mock-bar w-50"></div>
                          <div className="mock-bar w-40 thin"></div>
                        </div>
                        <div className="mock-amount"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating notification cards */}
              <div className="float-card float-1">
                 <div className="float-icon-wrapper success">
                   <CheckCircle size={18} strokeWidth={2.5}/>
                 </div>
                 <div className="float-info">
                   <div className="float-title">Invoice #1042 Paid</div>
                   <div className="float-subtitle">Just now</div>
                 </div>
              </div>
              
              <div className="float-card float-2">
                 <div className="float-icon-wrapper primary">
                   <Users size={16} strokeWidth={2.5}/>
                 </div>
                 <div className="float-info">
                   <div className="float-title">New Client added</div>
                   <div className="float-subtitle">Acme Corp</div>
                 </div>
              </div>
              
            </div>
          </div>
        </section>

        {/* FEATURES - BENTO GRID */}
        <section id="features" className="landing-bento">
          <div className="landing-section-header">
            <h2 className="landing-section-title">Everything you need below one roof</h2>
            <p className="landing-section-subtitle">A powerful, lightweight suite designed to keep your freelance work organized and payments securely tracked.</p>
          </div>
          
          <div className="bento-grid">
            <div className="bento-card card-large">
              <div className="bento-icon"><Users size={32} /></div>
              <h3 className="bento-title">Client Management</h3>
              <p className="bento-desc">Keep all your client details, history, and notes in one easily searchable place. No more digging through emails to find a phone number.</p>
            </div>
            
            <div className="bento-card">
              <div className="bento-icon"><Briefcase size={32} /></div>
              <h3 className="bento-title">Job Tracking</h3>
              <p className="bento-desc">Move every job through simple statuses: Pending, Ongoing, and Delivered.</p>
            </div>
            
            <div className="bento-card">
              <div className="bento-icon"><Banknote size={32} /></div>
              <h3 className="bento-title">Payment Logs</h3>
              <p className="bento-desc">Record partial or full payments per job. Complete multi-currency support built in.</p>
            </div>
            
            <div className="bento-card">
              <div className="bento-icon"><FileText size={32} /></div>
              <h3 className="bento-title">Smart Invoicing</h3>
              <p className="bento-desc">Generate professional, print-ready PDF invoices instantly from job details.</p>
            </div>
            
            <div className="bento-card card-large gradient-card">
              <div className="bento-icon"><BarChart3 size={32} /></div>
              <h3 className="bento-title">At-a-Glance Dashboard</h3>
              <p className="bento-desc">Get a bird's eye view of your entire business. See pending payments, active jobs, and recent client activity the moment you log in.</p>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="landing-how">
          <div className="landing-section-header">
            <h2 className="landing-section-title">How it works</h2>
            <p className="landing-section-subtitle">Three straightforward steps to streamline your workflow.</p>
          </div>
          
          <div className="how-steps">
            <div className="how-step">
              <div className="step-number">1</div>
              <h3 className="step-title">Add a Client</h3>
              <p className="step-desc">Enter their contact info and details to keep your digital rolodex organized and accessible anywhere.</p>
            </div>
            <div className="how-step line">
              <div className="step-number">2</div>
              <h3 className="step-title">Create a Job</h3>
              <p className="step-desc">Define the deliverables, set the price, select the currency, and track the status as you work.</p>
            </div>
            <div className="how-step line">
              <div className="step-number">3</div>
              <h3 className="step-title">Get Paid</h3>
              <p className="step-desc">Log your payments directly into the system and quickly generate invoices to finalize the project.</p>
            </div>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="landing-cta">
          <div className="cta-content">
            <h2 className="cta-title">Ready to take control of your work?</h2>
            <p className="cta-subtitle">Join freelancers everywhere who use ClientKhata to stay organized, manage projects, and get paid.</p>
            
            <div className="cta-actions">
              {!user ? (
                <Link to="/login" className="btn btn-primary btn-lg cta-btn">
                  Start Managing Clients <ArrowRight size={18} />
                </Link>
              ) : (
                <Link to="/dashboard" className="btn btn-primary btn-lg cta-btn">
                  Go to Dashboard <ArrowRight size={18} />
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer__inner">
          <div className="footer-brand">
            <BrandIcon size={24} className="footer-logo" />
            <span className="footer-name">ClientKhata</span>
          </div>
          
          <div className="footer-links">
            <span className="landing-footer__copy">© {new Date().getFullYear()}</span>
            <span className="landing-footer__version">|</span>
            <span className="landing-footer__dev-name">
              Developed by{' '}
              <a href="https://abdussamiakanda.com" target="_blank" rel="noopener noreferrer" className="landing-footer__link">
                Md Abdus Sami Akanda
              </a>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

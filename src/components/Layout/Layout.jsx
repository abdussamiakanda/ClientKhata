import { useState, useRef, useEffect } from 'react';
import { Outlet, useNavigate, useLocation, Link, NavLink } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Home, Users, Briefcase, Banknote, Settings, LogOut, User, Menu, X, Target, LayoutDashboard } from 'lucide-react';
import { BrandIcon } from '../BrandIcon';
import { navFromForNext } from '../../utils/navBack';
import './Layout.css';

export function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [sidebarOpen]);

  // Close sidebar on route change for mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    signOut(auth).then(() => navigate('/'));
  }

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';

  const NAV_ITEMS = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/jobs', icon: Briefcase, label: 'Jobs' },
    { to: '/payments', icon: Banknote, label: 'Payments' },
    { to: '/clients', icon: Users, label: 'Clients' },
    { to: '/hunt', icon: Target, label: 'Hunt' },
  ];

  return (
    <div className="app-layout">
      {/* Mobile Header */}
      <header className="app-header-mobile">
        <div className="app-header-mobile__inner">
          <button
            type="button"
            className="app-header-mobile__toggle"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={24} />
          </button>
          <Link to="/" className="app-logo">
            <BrandIcon size={24} className="app-logo__icon" />
            <span>ClientKhata</span>
          </Link>
        </div>
      </header>

      {/* Sidebar Overlay */}
      <div
        className={`app-sidebar-overlay ${sidebarOpen ? 'app-sidebar-overlay--open' : ''}`}
        onClick={() => setSidebarOpen(false)}
        onKeyDown={(e) => e.key === 'Escape' && setSidebarOpen(false)}
        role="button"
        tabIndex={-1}
        aria-hidden={!sidebarOpen}
      />

      {/* Sidebar */}
      <aside className={`app-sidebar ${sidebarOpen ? 'app-sidebar--open' : ''}`} aria-label="Main navigation">
        <div className="app-sidebar__header">
          <Link to="/" className="app-logo app-sidebar__logo">
            <div className="app-logo__icon-wrapper">
              <BrandIcon size={24} className="app-logo__icon" />
            </div>
            <span className="app-logo__text">ClientKhata</span>
          </Link>
          <button
            type="button"
            className="app-sidebar__close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="app-sidebar__nav">
          <div className="app-sidebar__nav-label">Main Menu</div>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `app-sidebar__link ${isActive ? 'app-sidebar__link--active' : ''}`}
            >
              <item.icon size={20} className="app-sidebar__icon" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="app-sidebar__footer">
          <div className="app-sidebar__user">
            <div className="app-sidebar__avatar">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" width={36} height={36} />
              ) : (
                <User size={20} className="app-sidebar__avatar-icon" />
              )}
            </div>
            <div className="app-sidebar__user-info">
              <span className="app-sidebar__user-name">{displayName}</span>
              {user?.email && <span className="app-sidebar__user-email">{user.email}</span>}
            </div>
          </div>
          <div className="app-sidebar__actions">
            <Link to="/settings" state={navFromForNext(location)} className="app-sidebar__action-btn">
              <Settings size={18} />
              <span>Settings</span>
            </Link>
            <button type="button" className="app-sidebar__action-btn app-sidebar__action-btn--logout" onClick={handleLogout}>
              <LogOut size={18} />
              <span>Log out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}


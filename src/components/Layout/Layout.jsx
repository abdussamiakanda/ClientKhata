import { useState, useRef, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Link, NavLink } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Home, Users, Briefcase, Banknote, Settings, LogOut, User, ChevronDown } from 'lucide-react';
import { BrandIcon } from '../BrandIcon';
import './Layout.css';

export function Layout() {
  const { user } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [dropdownOpen]);

  function handleLogout() {
    setDropdownOpen(false);
    signOut(auth);
  }

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header__inner">
        <Link to="/dashboard" className="app-logo">
          <BrandIcon size={28} className="app-logo__icon" />
          ClientKhata
        </Link>
        <nav className="app-nav">
          <NavLink to="/dashboard" className={({ isActive }) => `app-nav__link ${isActive ? 'app-nav__link--active' : ''}`} end>
            <Home size={18} className="app-nav__icon" />
            <span className="app-nav__link-text">Home</span>
          </NavLink>
          <NavLink to="/clients" className={({ isActive }) => `app-nav__link ${isActive ? 'app-nav__link--active' : ''}`}>
            <Users size={18} className="app-nav__icon" />
            <span className="app-nav__link-text">Clients</span>
          </NavLink>
          <NavLink to="/jobs" className={({ isActive }) => `app-nav__link ${isActive ? 'app-nav__link--active' : ''}`}>
            <Briefcase size={18} className="app-nav__icon" />
            <span className="app-nav__link-text">Jobs</span>
          </NavLink>
          <NavLink to="/payments" className={({ isActive }) => `app-nav__link ${isActive ? 'app-nav__link--active' : ''}`}>
            <Banknote size={18} className="app-nav__icon" />
            <span className="app-nav__link-text">Payments</span>
          </NavLink>
        </nav>
        <div className="app-header__actions" ref={dropdownRef}>
          <button
            type="button"
            className="app-header__user-trigger"
            onClick={(e) => { e.stopPropagation(); setDropdownOpen((o) => !o); }}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
            aria-label="User menu"
          >
            <span className="app-header__avatar">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" width={32} height={32} />
              ) : (
                <User size={18} className="app-header__avatar-icon" />
              )}
            </span>
            <ChevronDown size={16} className={`app-header__chevron ${dropdownOpen ? 'app-header__chevron--open' : ''}`} />
          </button>
          <div className={`app-header__dropdown ${dropdownOpen ? 'app-header__dropdown--open' : ''}`}>
            <div className="app-header__dropdown-head">
              <span className="app-header__dropdown-name">{displayName}</span>
              {user?.email && <span className="app-header__dropdown-email">{user.email}</span>}
            </div>
            <div className="app-header__dropdown-divider" />
            <Link to="/settings" className="app-header__dropdown-item" onClick={() => setDropdownOpen(false)}>
              <Settings size={16} />
              Settings
            </Link>
            <button type="button" className="app-header__dropdown-item app-header__dropdown-item--logout" onClick={handleLogout}>
              <LogOut size={16} />
              Log out
            </button>
          </div>
        </div>
        </div>
      </header>
      <main className="app-main">
        <Outlet />
      </main>
    </div>
  );
}

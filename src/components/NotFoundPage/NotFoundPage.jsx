import { Link } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';
import './NotFoundPage.css';

export function NotFoundPage() {
  return (
    <div className="not-found-page">
      <div className="not-found-container">
        <div className="not-found-icon-wrap">
          <AlertCircle size={48} className="not-found-icon" strokeWidth={2.5} />
        </div>
        <h1 className="not-found-title">404</h1>
        <h2 className="not-found-subtitle">Page Not Found</h2>
        <p className="not-found-desc">
          Oops! It looks like you've wandered off the map. The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="btn btn-primary not-found-btn">
          <Home size={18} />
          Back to Home
        </Link>
      </div>
    </div>
  );
}

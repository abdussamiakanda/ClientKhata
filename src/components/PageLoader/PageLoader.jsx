import { BrandIcon } from '../BrandIcon';
import './PageLoader.css';

export function PageLoader({ text = "Loading...", fullPage = false }) {
  return (
    <div className={`page-loader ${fullPage ? 'page-loader--full' : ''}`}>
      <BrandIcon size={48} className="page-loader__logo" />
      <h2 className="page-loader__brand">ClientKhata</h2>
      <div className="page-loader__progress">
        <div className="page-loader__progress-bar"></div>
      </div>
      <p className="page-loader__text">{text}</p>
    </div>
  );
}

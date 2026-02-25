import { X } from 'lucide-react';
import './ConfirmModal.css';

/**
 * Confirm or alert modal.
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {string} [props.title] - Optional heading
 * @param {string} props.message - Body text
 * @param {string} [props.confirmLabel='OK']
 * @param {string} [props.cancelLabel] - If provided, show Cancel button (confirm mode); otherwise single button (alert mode)
 * @param {'danger'|'primary'} [props.variant='primary'] - Confirm button style
 * @param {() => void} props.onConfirm
 * @param {() => void} props.onClose - Called on overlay click or Cancel
 */
export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'OK',
  cancelLabel,
  variant = 'primary',
  onConfirm,
  onClose,
}) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div
      className="modal-overlay confirm-modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="modal-content confirm-modal-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'confirm-modal-title' : undefined}
        aria-describedby="confirm-modal-message"
      >
        {title && (
          <div className="modal-header confirm-modal-header">
            <h2 id="confirm-modal-title" className="modal-title">
              {title}
            </h2>
            <button
              type="button"
              className="modal-close"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div className="confirm-modal-body">
          <p id="confirm-modal-message" className="confirm-modal-message">
            {message}
          </p>
        </div>
        <div className="modal-footer confirm-modal-footer">
          {cancelLabel && (
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            className={`btn ${variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

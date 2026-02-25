import { useState, useEffect, useMemo } from 'react';
import { addPayment, updatePayment } from '../../firebase/payments';
import { JOB_STATUSES, CURRENCIES } from '../../schema/paymentSchema';
import { X } from 'lucide-react';
import './PaymentForm.css';

export function PaymentForm({ userId, clients, editingPayment, defaultClientId, fixedClientId, onClose }) {
  const [clientId, setClientId] = useState('');
  const [workDescription, setWorkDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('BDT');
  const [status, setStatus] = useState('Pending');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isEdit = Boolean(editingPayment?.id);
  const selectedClient = clients?.find((c) => c.id === clientId);
  const isClientLocked = Boolean(fixedClientId && !isEdit);

  const clientsForDropdown = useMemo(() => {
    const list = (clients || []).filter((c) => c.active !== false);
    if (isClientLocked && fixedClientId) {
      const fixed = list.find((c) => c.id === fixedClientId);
      return fixed ? [fixed] : list;
    }
    if (isEdit && clientId && !list.some((c) => c.id === clientId)) {
      const current = clients?.find((c) => c.id === clientId);
      if (current) return [current, ...list];
    }
    return list;
  }, [clients, isEdit, clientId, isClientLocked, fixedClientId]);

  const hasClients = clientsForDropdown.length > 0;

  useEffect(() => {
    if (editingPayment) {
      setClientId(editingPayment.clientId || '');
      setWorkDescription(editingPayment.workDescription || '');
      setNotes(editingPayment.notes || '');
      setAmount(editingPayment.amount != null ? String(editingPayment.amount) : '');
      setCurrency(CURRENCIES.some((c) => c.code === editingPayment.currency) ? editingPayment.currency : 'BDT');
      setStatus(JOB_STATUSES.includes(editingPayment.status) ? editingPayment.status : 'Pending');
    } else {
      setClientId(fixedClientId || defaultClientId || '');
      setWorkDescription('');
      setNotes('');
      setAmount('');
      setCurrency('BDT');
      setStatus('Pending');
    }
  }, [editingPayment, defaultClientId, fixedClientId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const effectiveClientId = isClientLocked ? fixedClientId : clientId;
    if (!effectiveClientId) {
      setError('Please select a client.');
      return;
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      setError('Please enter a valid amount.');
      return;
    }
    const clientForName = clients?.find((c) => c.id === effectiveClientId);
    const clientName = clientForName?.clientName ?? selectedClient?.clientName ?? editingPayment?.clientName ?? '';
    setSaving(true);
    try {
      if (isEdit) {
        await updatePayment(editingPayment.id, {
          clientId: effectiveClientId,
          clientName,
          workDescription: workDescription.trim(),
          notes: notes.trim(),
          amount: numAmount,
          currency,
          status: JOB_STATUSES.includes(status) ? status : 'Pending',
        });
      } else {
        await addPayment(userId, {
          clientId: effectiveClientId,
          clientName,
          workDescription: workDescription.trim(),
          notes: notes.trim(),
          amount: numAmount,
          currency,
        });
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal-content" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Job' : 'Add Job'}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="payment-form">
          {error && <div className="form-error">{error}</div>}
          {!hasClients && !isEdit && (
            <div className="form-error">Add at least one active client before adding a job.</div>
          )}
          <label className="form-label">
            Client *
            {isClientLocked && selectedClient ? (
              <div className="form-input form-input--readonly" aria-readonly>
                {selectedClient.clientName}
              </div>
            ) : (
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="form-input"
                required
                disabled={!hasClients && !isEdit}
              >
                <option value="">Select client…</option>
                {clientsForDropdown.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.clientName}
                  </option>
                ))}
              </select>
            )}
          </label>
          <label className="form-label">
            Job description *
            <input
              type="text"
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
              className="form-input"
              required
              placeholder="e.g. job title or short description"
            />
          </label>
          <label className="form-label">
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-input form-input--textarea"
              placeholder="Optional notes for this job"
              rows={3}
            />
          </label>
          <label className="form-label">
            Amount *
            <div className="form-amount-row">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="form-input form-input--currency"
                aria-label="Currency"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="form-input"
                required
                placeholder="0"
              />
            </div>
          </label>
          <label className="form-label">
            Job status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="form-input"
              disabled={!isEdit}
            >
              {JOB_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            {!isEdit && (
              <span className="form-hint">New jobs start as Pending. Change status on the board.</span>
            )}
          </label>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || (!hasClients && !isEdit)}>
              {saving ? 'Saving…' : isEdit ? 'Update' : 'Add Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

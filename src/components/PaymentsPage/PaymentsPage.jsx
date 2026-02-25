import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { subscribePayments, updatePayment } from '../../firebase/payments';
import {
  subscribePaymentRecords,
  addPaymentRecord,
  deletePaymentRecord,
} from '../../firebase/paymentRecords';
import { formatAmount, formatTimestamp } from '../../utils/format';
import { getStatusBadgeClass } from '../../utils/format';
import { ConfirmModal } from '../ConfirmModal';
import { Banknote, Plus, Trash2, X } from 'lucide-react';
import './PaymentsPage.css';

export function PaymentsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [records, setRecords] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({ jobId: '', amount: '', note: '' });
  const [addError, setAddError] = useState('');
  const [removeRecord, setRemoveRecord] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubJobs = subscribePayments(setJobs);
    const unsubRecords = subscribePaymentRecords((list) => {
      setRecords(list);
      setLoaded(true);
    });
    return () => {
      unsubJobs();
      unsubRecords();
    };
  }, [user?.uid]);

  const totalByJob = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      if (!map[r.jobId]) map[r.jobId] = 0;
      map[r.jobId] += Number(r.amount) || 0;
    });
    return map;
  }, [records]);

  const recordsByJob = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      if (!map[r.jobId]) map[r.jobId] = [];
      map[r.jobId].push(r);
    });
    Object.keys(map).forEach((id) => map[id].sort((a, b) => (b.paidAt?.toMillis?.() ?? 0) - (a.paidAt?.toMillis?.() ?? 0)));
    return map;
  }, [records]);

  const unpaidJobs = useMemo(() => {
    return jobs.filter((j) => {
      const total = totalByJob[j.id] || 0;
      return total < Number(j.amount);
    });
  }, [jobs, totalByJob]);

  const paidJobs = useMemo(() => {
    return jobs.filter((j) => {
      const total = totalByJob[j.id] || 0;
      return total >= Number(j.amount) && Number(j.amount) > 0;
    });
  }, [jobs, totalByJob]);

  const jobsWithPayments = useMemo(() => {
    return jobs.filter((j) => (recordsByJob[j.id]?.length || 0) > 0);
  }, [jobs, recordsByJob]);

  function getTotalPaid(jobId) {
    return totalByJob[jobId] || 0;
  }

  function getRemaining(job) {
    return Math.max(0, Number(job.amount) - getTotalPaid(job.id));
  }

  const handleAddPayment = async (e) => {
    e.preventDefault();
    setAddError('');
    const jobId = addForm.jobId.trim();
    const amount = parseFloat(addForm.amount);
    if (!jobId) {
      setAddError('Select a job.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setAddError('Enter a valid amount.');
      return;
    }
    const job = jobs.find((j) => j.id === jobId);
    if (!job) {
      setAddError('Job not found.');
      return;
    }
    const currentTotal = getTotalPaid(jobId);
    const remaining = getRemaining(job);
    if (amount > remaining) {
      const curr = job.currency ?? 'BDT';
      setAddError(`Remaining is ${formatAmount(remaining, curr)}. Enter up to that amount.`);
      return;
    }
    setBusyId('add');
    try {
      await addPaymentRecord(
        jobId,
        amount,
        addForm.note.trim() || undefined,
        user?.uid,
        Number(job.amount),
        currentTotal,
        job.status || 'Delivered'
      );
      setAddForm({ jobId: '', amount: '', note: '' });
      setAddModalOpen(false);
    } catch (err) {
      setAddError(err.message || 'Failed to add payment');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteRecord = async (record, job) => {
    if (!record || !job) return;
    setBusyId(record.id);
    try {
      await deletePaymentRecord(record.id);
      const newTotal = getTotalPaid(job.id) - Number(record.amount);
      const noLongerPaidInFull = newTotal < Number(job.amount);
      if (noLongerPaidInFull && job.status === 'Paid') {
        await updatePayment(job.id, { status: 'Delivered' });
      }
      setRemoveRecord(null);
    } catch (err) {
      alert(err.message || 'Failed to remove payment');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page payments-page">
      <div className="page-header">
        <h1 className="page-title">Payments</h1>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setAddForm({ jobId: unpaidJobs[0]?.id || '', amount: '', note: '' });
            setAddError('');
            setAddModalOpen(true);
          }}
          disabled={unpaidJobs.length === 0}
        >
          <Plus size={18} />
          Add payment
        </button>
      </div>

      <div className="page-content">
        {!loaded ? (
          <div className="page-loading">
            <span className="page-loading__spinner" aria-hidden="true" />
            <span className="page-loading__text">Loading…</span>
          </div>
        ) : jobs.length === 0 ? (
          <div className="payments-empty">
            <Banknote size={48} className="payments-empty__icon" aria-hidden="true" />
            <p>No payments yet. Add jobs first, then record payments here.</p>
          </div>
        ) : (
          <div className="payments-content">
            {unpaidJobs.length > 0 && (
              <section className="payments-section">
                <h2 className="payments-section__title">Outstanding</h2>
                <ul className="payments-job-list">
                  {unpaidJobs.map((job) => {
                    const totalPaid = getTotalPaid(job.id);
                    const remaining = getRemaining(job);
                    const jobRecords = recordsByJob[job.id] || [];
                    return (
                      <li key={job.id} className="payments-job-card">
                        <div className="payments-job-card__head">
                          <div className="payments-job-card__info">
                            <span className="payments-job-card__client">{job.clientName || '—'}</span>
                            <span className="payments-job-card__desc">{job.workDescription || '—'}</span>
                            <span className="payments-job-card__meta">
                              Total {formatAmount(job.amount, job.currency ?? 'BDT')} · Paid {formatAmount(totalPaid, job.currency ?? 'BDT')} · Remaining {formatAmount(remaining, job.currency ?? 'BDT')}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="btn btn-primary btn-small"
                            onClick={() => {
                              setAddForm({
                                jobId: job.id,
                                amount: String(remaining),
                                note: '',
                              });
                              setAddError('');
                              setAddModalOpen(true);
                            }}
                            disabled={busyId === 'add'}
                          >
                            <Plus size={14} />
                            Add payment
                          </button>
                        </div>
                        {jobRecords.length > 0 && (
                          <ul className="payments-record-list">
                            {jobRecords.map((r) => (
                              <li key={r.id} className="payments-record-item">
                                <span className="payments-record-amount">{formatAmount(r.amount, job.currency ?? 'BDT')}</span>
                                <span className="payments-record-date">{formatTimestamp(r.paidAt, { short: true })}</span>
                                {r.note && <span className="payments-record-note">{r.note}</span>}
                                <button
                                  type="button"
                                  className="btn btn-icon btn-small btn-danger"
                                  onClick={() => setRemoveRecord({ record: r, job })}
                                  disabled={busyId !== null}
                                  aria-label="Remove payment"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {paidJobs.length > 0 && (
              <section className="payments-section">
                <h2 className="payments-section__title">Paid in full</h2>
                <ul className="payments-job-list">
                  {paidJobs.map((job) => {
                    const totalPaid = getTotalPaid(job.id);
                    const jobRecords = recordsByJob[job.id] || [];
                    return (
                      <li key={job.id} className="payments-job-card payments-job-card--paid">
                        <div className="payments-job-card__head">
                          <div className="payments-job-card__info">
                            <span className="payments-job-card__client">{job.clientName || '—'}</span>
                            <span className="payments-job-card__desc">{job.workDescription || '—'}</span>
                            <span className="payments-job-card__meta">
                              Total {formatAmount(job.amount, job.currency ?? 'BDT')} · Paid {formatAmount(totalPaid, job.currency ?? 'BDT')}
                            </span>
                            <span className={`status-badge status-badge--small ${getStatusBadgeClass(job.status)}`}>
                              {job.status}
                            </span>
                          </div>
                        </div>
                        <ul className="payments-record-list">
                          {jobRecords.map((r) => (
                            <li key={r.id} className="payments-record-item">
                              <span className="payments-record-amount">{formatAmount(r.amount)}</span>
                              <span className="payments-record-date">{formatTimestamp(r.paidAt, { short: true })}</span>
                              {r.note && <span className="payments-record-note">{r.note}</span>}
                              <button
                                type="button"
                                className="btn btn-icon btn-small btn-danger"
                                onClick={() => setRemoveRecord({ record: r, job })}
                                disabled={busyId !== null}
                                aria-label="Remove payment"
                              >
                                <Trash2 size={14} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>

      {/* Add payment modal */}
      {addModalOpen && (
        <div className="modal-overlay" onClick={() => setAddModalOpen(false)} role="presentation">
          <div
            className="modal-content payments-modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-payment-title"
          >
            <div className="modal-header">
              <h2 id="add-payment-title" className="modal-title">Add payment</h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setAddModalOpen(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddPayment} className="payment-form">
              {addError && <div className="form-error">{addError}</div>}
              <label className="form-label">
                Job *
                <select
                  value={addForm.jobId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const job = jobs.find((j) => j.id === id);
                    setAddForm((p) => ({
                      ...p,
                      jobId: id,
                      amount: job ? String(getRemaining(job)) : '',
                    }));
                  }}
                  className="form-input"
                  required
                >
                  <option value="">Select job…</option>
                  {unpaidJobs.map((job) => {
                    const rem = getRemaining(job);
                    return (
                      <option key={job.id} value={job.id}>
                        {job.clientName} – {job.workDescription} (remaining {formatAmount(rem, job.currency ?? 'BDT')})
                      </option>
                    );
                  })}
                </select>
              </label>
              <label className="form-label">
                Amount *
                {addForm.jobId && (() => {
                  const job = jobs.find((j) => j.id === addForm.jobId);
                  const curr = job?.currency ?? 'BDT';
                  return <span className="form-hint">In {curr}</span>;
                })()}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={addForm.amount}
                  onChange={(e) => setAddForm((p) => ({ ...p, amount: e.target.value }))}
                  className="form-input"
                  placeholder="0"
                  required
                />
              </label>
              <label className="form-label">
                Note
                <input
                  type="text"
                  value={addForm.note}
                  onChange={(e) => setAddForm((p) => ({ ...p, note: e.target.value }))}
                  className="form-input"
                  placeholder="Optional"
                />
              </label>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setAddModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={busyId === 'add'}>
                  {busyId === 'add' ? 'Adding…' : 'Add payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!removeRecord}
        title="Remove payment?"
        message={
          removeRecord
            ? `Remove ${formatAmount(removeRecord.record.amount, removeRecord.job.currency ?? 'BDT')} from "${removeRecord.job.workDescription}"?${removeRecord.job.status === 'Paid' ? ' Job will move back to Delivered.' : ''}`
            : ''
        }
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => removeRecord && handleDeleteRecord(removeRecord.record, removeRecord.job)}
        onClose={() => setRemoveRecord(null)}
      />
    </div>
  );
}

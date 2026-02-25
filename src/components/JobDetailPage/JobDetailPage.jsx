import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { subscribePayments, deletePayment, updatePaymentTimestamps } from '../../firebase/payments';
import { subscribePaymentRecords } from '../../firebase/paymentRecords';
import { subscribeClients } from '../../firebase/clients';
import { PaymentForm } from '../PaymentForm';
import { ConfirmModal } from '../ConfirmModal';
import { formatAmount, getStatusBadgeClass, formatTimestamp } from '../../utils/format';
import { JOB_STATUSES } from '../../schema/paymentSchema';
import { ArrowLeft, User, Pencil, Trash2, Calendar, DollarSign, FileText, CalendarPlus, PlayCircle, PackageCheck, CheckCircle } from 'lucide-react';
import './JobDetailPage.css';

const STATUS_LABELS = {
  Pending: 'Pending',
  Ongoing: 'Started working',
  Delivered: 'Delivered',
  Paid: 'Paid',
};

const STATUS_DATE_KEYS = {
  Pending: 'pendingAt',
  Ongoing: 'ongoingAt',
  Delivered: 'deliveredAt',
  Paid: 'paidAt',
};

/** Step key to Firestore field for date edits (created uses 'timestamp') */
const STEP_TO_FIELD = {
  created: 'timestamp',
  Ongoing: 'ongoingAt',
  Delivered: 'deliveredAt',
  Paid: 'paidAt',
};

function stepTsToDate(ts) {
  if (!ts) return null;
  if (typeof ts.toDate === 'function') return ts.toDate();
  if (ts instanceof Date) return ts;
  return null;
}

function dateToDatetimeLocal(d) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STEP_ICONS = {
  created: CalendarPlus,
  Ongoing: PlayCircle,
  Delivered: PackageCheck,
  Paid: CheckCircle,
};

export function JobDetailPage() {
  const { jobId } = useParams();
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [paymentRecords, setPaymentRecords] = useState([]);
  const [clients, setClients] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'OK',
    cancelLabel: null,
    variant: 'primary',
    onConfirm: () => {},
  });
  const [editingStepKey, setEditingStepKey] = useState(null);
  const [editingDateValue, setEditingDateValue] = useState('');
  const [savingDate, setSavingDate] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubPayments = subscribePayments((list) => {
      setPayments(list);
      if (!loaded) setLoaded(true);
    });
    const unsubRecords = subscribePaymentRecords(setPaymentRecords);
    const unsubClients = subscribeClients(setClients);
    return () => {
      unsubPayments();
      unsubRecords();
      unsubClients();
    };
  }, [user?.uid]);

  const job = useMemo(
    () => (jobId ? payments.find((p) => p.id === jobId) : null),
    [payments, jobId]
  );

  const totalPaid = useMemo(() => {
    if (!jobId) return 0;
    return paymentRecords
      .filter((r) => r.jobId === jobId)
      .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }, [paymentRecords, jobId]);

  const statusSteps = useMemo(() => {
    const created = job?.timestamp != null ? [{ key: 'created', label: 'Created', ts: job.timestamp }] : [];
    const jobRecords = (jobId && paymentRecords.filter((r) => r.jobId === jobId)) || [];
    const latestPaymentAt = jobRecords.length > 0
      ? jobRecords.reduce((latest, r) => {
          const t = r.paidAt?.toMillis?.() ?? (r.paidAt?.seconds != null ? r.paidAt.seconds * 1000 : 0);
          return t > latest ? t : latest;
        }, 0)
      : null;
    const paidTs = job?.paidAt ?? (job?.status === 'Paid' && latestPaymentAt ? { toDate: () => new Date(latestPaymentAt) } : null);
    // Omit Pending from timeline (created and pending are the same date)
    const statusStepsOnly = JOB_STATUSES.filter((s) => s !== 'Pending').map((status) => ({
      key: status,
      label: STATUS_LABELS[status],
      ts: status === 'Paid' ? paidTs : job?.[STATUS_DATE_KEYS[status]],
    }));
    return [...created, ...statusStepsOnly].filter((s) => s.ts != null);
  }, [job, jobId, paymentRecords]);

  const closeConfirmModal = () =>
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));

  const showConfirm = (opts) =>
    setConfirmModal({
      isOpen: true,
      title: opts.title ?? '',
      message: opts.message,
      confirmLabel: opts.confirmLabel ?? 'Confirm',
      cancelLabel: opts.cancelLabel ?? 'Cancel',
      variant: opts.variant ?? 'primary',
      onConfirm: opts.onConfirm ?? (() => {}),
    });

  const handleEdit = () => {
    setEditingPayment(job);
    setFormOpen(true);
  };

  const handleCloseForm = () => {
    setFormOpen(false);
    setEditingPayment(null);
  };

  function handleStartEditDate(step) {
    const d = stepTsToDate(step.ts);
    if (d) {
      setEditingStepKey(step.key);
      setEditingDateValue(dateToDatetimeLocal(d));
    }
  }

  function handleCancelEditDate() {
    setEditingStepKey(null);
    setEditingDateValue('');
  }

  async function handleSaveDate() {
    const field = STEP_TO_FIELD[editingStepKey];
    if (!job?.id || !field) return;
    setSavingDate(true);
    try {
      await updatePaymentTimestamps(job.id, { [field]: new Date(editingDateValue) });
      setEditingStepKey(null);
      setEditingDateValue('');
    } catch (err) {
      showConfirm({ title: '', message: err.message || 'Failed to update date', confirmLabel: 'OK' });
    } finally {
      setSavingDate(false);
    }
  }

  function handleDelete() {
    showConfirm({
      title: 'Delete job?',
      message: 'Are you sure you want to delete this job? This cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deletePayment(job.id);
          window.history.back();
        } catch (err) {
          showConfirm({ title: '', message: err.message || 'Failed to delete', confirmLabel: 'OK' });
        }
      },
    });
  }

  if (loaded && !job && jobId) {
    return (
      <div className="page job-detail-page">
        <div className="page-header">
          <Link to="/jobs" className="btn btn-secondary">
            <ArrowLeft size={18} />
            Back to Jobs
          </Link>
        </div>
        <div className="job-detail-not-found">
          <p>Job not found.</p>
          <Link to="/jobs" className="btn btn-primary">Back to Jobs</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page job-detail-page">
      <div className="page-header job-detail-page__header">
        <Link to="/jobs" className="btn btn-secondary">
          <ArrowLeft size={18} />
          Back to Jobs
        </Link>
      </div>

      {!job ? (
        <div className="page-loading">
          <span className="page-loading__spinner" aria-hidden="true" />
          <span className="page-loading__text">Loading…</span>
        </div>
      ) : (
        <>
          <section className="job-detail-card" aria-label="Job information">
            <div className="job-detail-card__header">
              <div className="job-detail-card__main">
                <h1 className="job-detail-card__title">{job.workDescription || 'Untitled job'}</h1>
                <span className={`job-detail-card__status status-badge ${getStatusBadgeClass(job.status)}`}>
                  {job.status}
                </span>
              </div>
              <div className="job-detail-card__actions">
                <button type="button" className="btn btn-primary" onClick={handleEdit}>
                  <Pencil size={16} />
                  Edit
                </button>
                <button type="button" className="btn btn-danger" onClick={handleDelete}>
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            </div>

            <div className="job-detail-card__body">
              <div className="job-detail-card__grid">
                <div className="job-detail-card__field">
                  <span className="job-detail-card__field-label">
                    <User size={16} />
                    Client
                  </span>
                  <Link to={`/client/${job.clientId}`} className="job-detail-card__field-value job-detail-card__link">
                    {job.clientName || '—'}
                  </Link>
                </div>
                <div className="job-detail-card__field">
                  <span className="job-detail-card__field-label">
                    <DollarSign size={16} />
                    Amount
                  </span>
                  <span className="job-detail-card__field-value job-detail-card__amount">
                    {formatAmount(job.amount, job.currency ?? 'BDT')}
                    <span className="job-detail-card__currency"> {job.currency ?? 'BDT'}</span>
                  </span>
                </div>
                {totalPaid > 0 && (
                  <div className="job-detail-card__field">
                    <span className="job-detail-card__field-label">Paid so far</span>
                    <span className="job-detail-card__field-value">
                      {formatAmount(totalPaid, job.currency ?? 'BDT')}
                    </span>
                  </div>
                )}
              </div>
              {job.notes && (
                <div className="job-detail-card__notes">
                  <span className="job-detail-card__field-label">
                    <FileText size={16} />
                    Notes
                  </span>
                  <p className="job-detail-card__notes-text">{job.notes}</p>
                </div>
              )}
            </div>
          </section>

          <section className="job-detail-section" aria-labelledby="job-timeline-title">
            <h2 id="job-timeline-title" className="job-detail-section__title">
              <Calendar size={20} />
              Status & dates
            </h2>
            <ul className="job-detail-timeline" aria-label="Status timeline">
              {statusSteps.length === 0 ? (
                <li className="job-detail-timeline__empty">No dates recorded yet.</li>
              ) : (
                statusSteps.map((step) => {
                  const StepIcon = STEP_ICONS[step.key] || Calendar;
                  return (
                  <li key={step.key} className="job-detail-timeline__item">
                    <span className="job-detail-timeline__icon" aria-hidden>
                      <StepIcon size={20} />
                    </span>
                    <div className="job-detail-timeline__content">
                      <span className="job-detail-timeline__label">{step.label}</span>
                      {editingStepKey === step.key ? (
                        <div className="job-detail-timeline__date-edit">
                          <input
                            type="datetime-local"
                            value={editingDateValue}
                            onChange={(e) => setEditingDateValue(e.target.value)}
                            className="job-detail-timeline__date-input"
                            disabled={savingDate}
                            aria-label={`Edit ${step.label} date`}
                          />
                          <div className="job-detail-timeline__date-actions">
                            <button
                              type="button"
                              className="btn btn-secondary btn-small"
                              onClick={handleCancelEditDate}
                              disabled={savingDate}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary btn-small"
                              onClick={handleSaveDate}
                              disabled={savingDate}
                            >
                              {savingDate ? 'Saving…' : 'Save'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="job-detail-timeline__date-row">
                          <span className="job-detail-timeline__date">
                            {formatTimestamp(step.ts, { longDate: true, time: true })}
                          </span>
                          <button
                            type="button"
                            className="job-detail-timeline__date-edit-btn"
                            onClick={() => handleStartEditDate(step)}
                            aria-label={`Edit ${step.label} date`}
                          >
                            <Pencil size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                  );
                })
              )}
            </ul>
          </section>
        </>
      )}

      {formOpen && (
        <PaymentForm
          userId={user?.uid}
          clients={clients}
          editingPayment={editingPayment}
          onClose={handleCloseForm}
        />
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        cancelLabel={confirmModal.cancelLabel}
        variant={confirmModal.variant}
        onConfirm={confirmModal.onConfirm}
        onClose={closeConfirmModal}
      />
    </div>
  );
}

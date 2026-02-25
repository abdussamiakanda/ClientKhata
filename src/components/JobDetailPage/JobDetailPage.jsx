import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { subscribePayments, deletePayment } from '../../firebase/payments';
import { subscribePaymentRecords } from '../../firebase/paymentRecords';
import { subscribeClients } from '../../firebase/clients';
import { PaymentForm } from '../PaymentForm';
import { ConfirmModal } from '../ConfirmModal';
import { formatAmount, getStatusBadgeClass, formatTimestamp } from '../../utils/format';
import { JOB_STATUSES } from '../../schema/paymentSchema';
import { ArrowLeft, User, Pencil, Trash2, Calendar, DollarSign, FileText } from 'lucide-react';
import './JobDetailPage.css';

const STATUS_LABELS = {
  Pending: 'Pending',
  Ongoing: 'Ongoing',
  Delivered: 'Delivered',
  Paid: 'Paid',
};

const STATUS_DATE_KEYS = {
  Pending: 'pendingAt',
  Ongoing: 'ongoingAt',
  Delivered: 'deliveredAt',
  Paid: 'paidAt',
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
    const steps = [
      { key: 'created', label: 'Created', ts: job?.timestamp },
      ...JOB_STATUSES.map((status) => ({
        key: status,
        label: STATUS_LABELS[status],
        ts: job?.[STATUS_DATE_KEYS[status]],
      })),
    ];
    return steps.filter((s) => s.ts != null);
  }, [job]);

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
                statusSteps.map((step, index) => (
                  <li key={step.key} className="job-detail-timeline__item">
                    <span className="job-detail-timeline__dot" aria-hidden />
                    <div className="job-detail-timeline__content">
                      <span className="job-detail-timeline__label">{step.label}</span>
                      <span className="job-detail-timeline__date">
                        {formatTimestamp(step.ts, { longDate: true, time: true })}
                      </span>
                    </div>
                  </li>
                ))
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

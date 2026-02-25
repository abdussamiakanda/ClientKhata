import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { subscribeClients } from '../../firebase/clients';
import { subscribePayments, deletePayment } from '../../firebase/payments';
import { subscribePaymentRecords } from '../../firebase/paymentRecords';
import { ClientForm } from '../ClientForm';
import { PaymentForm } from '../PaymentForm';
import { ConfirmModal } from '../ConfirmModal';
import { formatAmount, getStatusBadgeClass, formatTimestamp } from '../../utils/format';
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  Globe,
  MapPin,
  FileText,
  Pencil,
  Trash2,
  Briefcase,
  Plus,
  Eye,
} from 'lucide-react';
import './ClientDetailPage.css';

export function ClientDetailPage() {
  const { clientId } = useParams();
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentRecords, setPaymentRecords] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
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
    const unsubClients = subscribeClients(setClients);
    const unsubPayments = subscribePayments((list) => {
      setPayments(list);
      if (!loaded) setLoaded(true);
    });
    const unsubRecords = subscribePaymentRecords(setPaymentRecords);
    return () => {
      unsubClients();
      unsubPayments();
      unsubRecords();
    };
  }, [user?.uid]);

  const client = useMemo(
    () => (clientId ? clients.find((c) => c.id === clientId) : null),
    [clients, clientId]
  );

  const clientJobs = useMemo(
    () => (clientId ? payments.filter((p) => p.clientId === clientId) : []),
    [payments, clientId]
  );

  const jobIds = useMemo(() => new Set(clientJobs.map((j) => j.id)), [clientJobs]);

  const clientPaymentRecords = useMemo(
    () => paymentRecords.filter((r) => jobIds.has(r.jobId)),
    [paymentRecords, jobIds]
  );

  const totalPaidByJob = useMemo(() => {
    const map = {};
    clientPaymentRecords.forEach((r) => {
      map[r.jobId] = (map[r.jobId] || 0) + (Number(r.amount) || 0);
    });
    return map;
  }, [clientPaymentRecords]);

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

  const handleEditClient = () => {
    setEditingClient(client);
    setFormOpen(true);
  };

  const handleCloseClientForm = () => {
    setFormOpen(false);
    setEditingClient(null);
  };

  const handleAddJob = () => {
    setEditingPayment(null);
    setPaymentFormOpen(true);
  };

  const handleEditJob = (payment) => {
    setEditingPayment(payment);
    setPaymentFormOpen(true);
  };

  const handleClosePaymentForm = () => {
    setPaymentFormOpen(false);
    setEditingPayment(null);
  };

  function handleDeleteJob(job) {
    showConfirm({
      title: 'Delete job?',
      message: 'Are you sure you want to delete this job?',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deletePayment(job.id);
        } catch (err) {
          showConfirm({ title: '', message: err.message || 'Failed to delete', confirmLabel: 'OK' });
        }
      },
    });
  }

  function getStatusTimestamp(payment) {
    if (payment.status === 'Pending') return payment.pendingAt;
    if (payment.status === 'Ongoing') return payment.ongoingAt;
    if (payment.status === 'Delivered') return payment.deliveredAt;
    if (payment.status === 'Paid') return payment.paidAt;
    return null;
  }

  if (loaded && !client && clientId) {
    return (
      <div className="page client-detail-page">
        <div className="page-header">
          <Link to="/clients" className="btn btn-secondary">
            <ArrowLeft size={18} />
            Back to Clients
          </Link>
        </div>
        <div className="client-detail-not-found">
          <p>Client not found.</p>
          <Link to="/clients" className="btn btn-primary">Back to Clients</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page client-detail-page">
      <div className="page-header client-detail-page__header">
        <Link to="/clients" className="btn btn-secondary">
          <ArrowLeft size={18} />
          Back to Clients
        </Link>
      </div>

      {!client ? (
        <div className="page-loading">
          <span className="page-loading__spinner" aria-hidden="true" />
          <span className="page-loading__text">Loading…</span>
        </div>
      ) : (
        <>
          {/* Client info card */}
          <section className="client-detail-card" aria-label="Client information">
            <div className="client-detail-card__header">
              <div className="client-detail-card__avatar-wrap">
                {client.imageBase64 ? (
                  <img src={client.imageBase64} alt="" className="client-detail-card__avatar" />
                ) : (
                  <span className="client-detail-card__avatar-placeholder">
                    {client.clientName.charAt(0).toUpperCase() || '?'}
                  </span>
                )}
              </div>
              <div className="client-detail-card__info">
                <h1 className="client-detail-card__name">{client.clientName}</h1>
                {client.institution && (
                  <p className="client-detail-card__row">
                    <Building2 size={16} />
                    <span>{client.institution}</span>
                  </p>
                )}
                <span className={`client-detail-card__badge ${client.active !== false ? 'client-detail-card__badge--active' : 'client-detail-card__badge--inactive'}`}>
                  {client.active !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
              <button type="button" className="btn btn-primary" onClick={handleEditClient}>
                <Pencil size={16} />
                Edit client
              </button>
            </div>
            <div className="client-detail-card__body">
              {client.contactNumber && (
                <p className="client-detail-card__row">
                  <Phone size={16} />
                  <a href={`tel:${client.contactNumber}`}>{client.contactNumber}</a>
                </p>
              )}
              {client.email && (
                <p className="client-detail-card__row">
                  <Mail size={16} />
                  <a href={`mailto:${client.email}`}>{client.email}</a>
                </p>
              )}
              {client.website && (
                <p className="client-detail-card__row">
                  <Globe size={16} />
                  <a href={client.website.startsWith('http') ? client.website : `https://${client.website}`} target="_blank" rel="noopener noreferrer">
                    {client.website.replace(/^https?:\/\//, '')}
                  </a>
                </p>
              )}
              {client.address && (
                <p className="client-detail-card__row">
                  <MapPin size={16} />
                  <span>{client.address}</span>
                </p>
              )}
              {client.notes && (
                <p className="client-detail-card__row client-detail-card__notes">
                  <FileText size={16} />
                  <span>{client.notes}</span>
                </p>
              )}
            </div>
          </section>

          {/* Jobs */}
          <section className="client-detail-section" aria-labelledby="client-jobs-title">
            <div className="client-detail-section__head">
              <h2 id="client-jobs-title" className="client-detail-section__title">
                <Briefcase size={20} />
                Jobs
              </h2>
              <button type="button" className="btn btn-primary" onClick={handleAddJob}>
                <Plus size={18} />
                Add Job
              </button>
            </div>
            <div className="client-detail-jobs">
              {clientJobs.length === 0 ? (
                <p className="client-detail-empty">No jobs yet. Add a job for this client.</p>
              ) : (
                <ul className="client-detail-jobs-list" aria-label="Jobs">
                  {clientJobs.map((job) => (
                    <li key={job.id} className="client-detail-job">
                      <div className="client-detail-job__main">
                        <span className="client-detail-job__desc">{job.workDescription || '—'}</span>
                        <span className="client-detail-job__amount">{formatAmount(job.amount, job.currency ?? 'BDT')}</span>
                      </div>
                      <div className="client-detail-job__meta">
                        <span className={`status-badge ${getStatusBadgeClass(job.status)}`}>{job.status}</span>
                        {getStatusTimestamp(job) && (
                          <span className="client-detail-job__date">{formatTimestamp(getStatusTimestamp(job), { short: true })}</span>
                        )}
                        {(totalPaidByJob[job.id] ?? 0) > 0 && (
                          <span className="client-detail-job__paid">Paid: {formatAmount(totalPaidByJob[job.id], job.currency ?? 'BDT')}</span>
                        )}
                      </div>
                      <div className="client-detail-job__actions">
                        <Link
                          to={`/job/${job.id}`}
                          className="btn btn-small btn-secondary"
                          aria-label="View job"
                        >
                          <Eye size={14} />
                          View
                        </Link>
                        <button type="button" className="btn btn-small btn-secondary" onClick={() => handleEditJob(job)} aria-label="Edit job">
                          <Pencil size={14} />
                          Edit
                        </button>
                        <button type="button" className="btn btn-small btn-danger" onClick={() => handleDeleteJob(job)} aria-label="Delete job">
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}

      {formOpen && (
        <ClientForm userId={user?.uid} editingClient={editingClient} onClose={handleCloseClientForm} />
      )}

      {paymentFormOpen && (
        <PaymentForm
          userId={user?.uid}
          clients={clients}
          editingPayment={editingPayment}
          defaultClientId={client?.id}
          onClose={handleClosePaymentForm}
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

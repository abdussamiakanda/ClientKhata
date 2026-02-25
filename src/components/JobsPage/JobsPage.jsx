import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { subscribePayments, updatePayment, deletePayment } from '../../firebase/payments';
import { subscribePaymentRecords } from '../../firebase/paymentRecords';
import { subscribeClients } from '../../firebase/clients';
import { PaymentForm } from '../PaymentForm';
import { PaymentTable } from '../PaymentTable';
import { PaymentBoard } from '../PaymentBoard';
import { ConfirmModal } from '../ConfirmModal';
import { Plus } from 'lucide-react';
import './JobsPage.css';

export function JobsPage() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [paymentRecords, setPaymentRecords] = useState([]);
  const [clients, setClients] = useState([]);
  const [paymentsLoaded, setPaymentsLoaded] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [view, setView] = useState('board');
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'OK',
    cancelLabel: null,
    variant: 'primary',
    onConfirm: () => {},
  });

  const closeConfirmModal = () =>
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));

  const showAlert = (message) =>
    setConfirmModal({
      isOpen: true,
      title: '',
      message,
      confirmLabel: 'OK',
      cancelLabel: undefined,
      variant: 'primary',
      onConfirm: () => {},
    });

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

  useEffect(() => {
    if (!user?.uid) return;
    const unsubPayments = subscribePayments((list) => {
      setPayments(list);
      setPaymentsLoaded(true);
    });
    const unsubRecords = subscribePaymentRecords(setPaymentRecords);
    const unsubClients = subscribeClients(setClients);
    return () => {
      unsubPayments();
      unsubRecords();
      unsubClients();
    };
  }, [user?.uid]);

  const totalPaidByJob = useMemo(() => {
    const map = {};
    paymentRecords.forEach((r) => {
      map[r.jobId] = (map[r.jobId] || 0) + (Number(r.amount) || 0);
    });
    return map;
  }, [paymentRecords]);

  const handleAdd = () => {
    setEditingPayment(null);
    setFormOpen(true);
  };

  const handleEdit = (payment) => {
    setEditingPayment(payment);
    setFormOpen(true);
  };

  const handleClose = () => {
    setFormOpen(false);
    setEditingPayment(null);
  };

  async function handleStatusChange(jobId, newStatus) {
    try {
      if (newStatus === 'Delivered') {
        const job = payments.find((p) => p.id === jobId);
        const totalPaid = totalPaidByJob[jobId] || 0;
        if (job && totalPaid >= Number(job.amount) && Number(job.amount) > 0) {
          await updatePayment(jobId, { status: 'Paid', setDeliveredAt: true });
          return;
        }
      }
      await updatePayment(jobId, { status: newStatus });
    } catch (err) {
      showAlert(err.message || 'Failed to update status');
    }
  }

  function handleDelete(job) {
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
          showAlert(err.message || 'Failed to delete');
        }
      },
    });
  }

  return (
    <div className="page jobs-page">
      <div className="page-header">
        <h1 className="page-title">Jobs</h1>
        <div className="jobs-page__toolbar">
          <div className="view-toggle">
            <button
              type="button"
              className={`view-toggle-btn ${view === 'board' ? 'view-toggle-btn--active' : ''}`}
              onClick={() => setView('board')}
            >
              Board
            </button>
            <button
              type="button"
              className={`view-toggle-btn ${view === 'table' ? 'view-toggle-btn--active' : ''}`}
              onClick={() => setView('table')}
            >
              Table
            </button>
          </div>
          <button type="button" className="btn btn-primary" onClick={handleAdd}>
            <Plus size={18} />
            Add Job
          </button>
        </div>
      </div>

      <div className="page-content">
        {!paymentsLoaded ? (
          <div className="page-loading">
            <span className="page-loading__spinner" aria-hidden="true" />
            <span className="page-loading__text">Loading jobs…</span>
          </div>
        ) : (
          <>
            {view === 'board' ? (
          <PaymentBoard
            payments={payments}
            totalPaidByJob={totalPaidByJob}
            onStatusChange={handleStatusChange}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
            ) : (
              <PaymentTable
                payments={payments}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}
          </>
        )}
      </div>

      {formOpen && (
        <PaymentForm
          userId={user?.uid}
          clients={clients}
          editingPayment={editingPayment}
          onClose={handleClose}
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

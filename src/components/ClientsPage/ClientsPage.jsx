import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import { subscribeClients, deleteClient } from '../../firebase/clients';
import { subscribePayments } from '../../firebase/payments';
import { ClientForm } from '../ClientForm';
import { ConfirmModal } from '../ConfirmModal';
import { Building2, Phone, Mail, Globe, MapPin, FileText, Pencil, Trash2, Plus, Info } from 'lucide-react';
import './ClientsPage.css';

export function ClientsPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]);
  const [clientsLoaded, setClientsLoaded] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubClients = subscribeClients((list) => {
      setClients(list);
      setClientsLoaded(true);
    });
    const unsubPayments = subscribePayments(setPayments);
    return () => {
      unsubClients();
      unsubPayments();
    };
  }, [user?.uid]);

  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
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

  const showAlert = (message, title = '') =>
    setConfirmModal({
      isOpen: true,
      title,
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

  const handleAdd = () => {
    setEditingClient(null);
    setFormOpen(true);
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormOpen(true);
  };

  const handleClose = () => {
    setFormOpen(false);
    setEditingClient(null);
  };

  async function handleDelete(client) {
    const jobCount = payments.filter((p) => p.clientId === client.id).length;
    if (jobCount > 0) {
      showAlert(
        `Cannot delete "${client.clientName}": they have ${jobCount} job(s). Delete or reassign jobs first.`
      );
      return;
    }
    showConfirm({
      title: 'Delete client?',
      message: `Are you sure you want to delete "${client.clientName}"?`,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteClient(client.id);
          setFormOpen(false);
          setEditingClient(null);
        } catch (err) {
          showAlert(err.message || 'Failed to delete client');
        }
      },
    });
  }

  return (
    <div className="page clients-page">
      <div className="page-header">
        <h1 className="page-title">Clients</h1>
        <button type="button" className="btn btn-primary" onClick={handleAdd}>
          <Plus size={18} />
          Add Client
        </button>
      </div>

      <div className="page-content">
        {!clientsLoaded ? (
          <div className="page-loading">
            <span className="page-loading__spinner" aria-hidden="true" />
            <span className="page-loading__text">Loading clients…</span>
          </div>
        ) : clients.length === 0 ? (
          <div className="clients-empty">
            <p>No clients yet. Add your first client to get started.</p>
            <button type="button" className="btn btn-primary" onClick={handleAdd}>
              <Plus size={18} />
              Add Client
            </button>
          </div>
        ) : (
          <ul className="clients-grid" aria-label="Clients">
            {clients.map((client) => (
              <li key={client.id} className="client-card">
                <div className="client-card__header">
                  <div className="client-card__avatar-wrap">
                    {client.imageBase64 ? (
                      <img
                        src={client.imageBase64}
                        alt=""
                        className="client-card__avatar"
                      />
                    ) : (
                      <span className="client-card__avatar-placeholder" aria-hidden="true">
                        {client.clientName.charAt(0).toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  <div className="client-card__header-info">
                    <h3 className="client-card__name">{client.clientName}</h3>
                    {client.institution && (
                      <p className="client-card__line client-card__line--institution">
                        <Building2 size={14} aria-hidden />
                        <span>{client.institution}</span>
                      </p>
                    )}
                  </div>
                </div>
                <div className="client-card__body">
                  {client.contactNumber && (
                    <p className="client-card__line">
                      <Phone size={14} aria-hidden />
                      <a href={`tel:${client.contactNumber}`}>{client.contactNumber}</a>
                    </p>
                  )}
                  {client.email && (
                    <p className="client-card__line">
                      <Mail size={14} aria-hidden />
                      <a href={`mailto:${client.email}`}>{client.email}</a>
                    </p>
                  )}
                  {client.website && (
                    <p className="client-card__line">
                      <Globe size={14} aria-hidden />
                      <a href={client.website.startsWith('http') ? client.website : `https://${client.website}`} target="_blank" rel="noopener noreferrer">
                        {client.website.replace(/^https?:\/\//, '')}
                      </a>
                    </p>
                  )}
                  {client.address && (
                    <p className="client-card__line">
                      <MapPin size={14} aria-hidden />
                      <span>{client.address}</span>
                    </p>
                  )}
                  {client.notes && (
                    <p className="client-card__line client-card__notes">
                      <FileText size={14} aria-hidden />
                      <span>{client.notes}</span>
                    </p>
                  )}
                </div>
                <div className="client-card__footer">
                  <Link
                    to={`/client/${client.id}`}
                    className="btn btn-small btn-secondary"
                    aria-label="View details"
                  >
                    <Info size={14} />
                    Details
                  </Link>
                  <button
                    type="button"
                    className="btn btn-small btn-secondary"
                    onClick={() => handleEdit(client)}
                    aria-label="Edit client"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-small btn-danger"
                    onClick={() => handleDelete(client)}
                    aria-label="Delete client"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {formOpen && (
        <ClientForm
          userId={user?.uid}
          editingClient={editingClient}
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

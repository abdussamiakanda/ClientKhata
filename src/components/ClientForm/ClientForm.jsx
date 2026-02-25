import { useState, useEffect, useRef } from 'react';
import { addClient, updateClient } from '../../firebase/clients';
import { compressImageToBase64 } from '../../utils/imageCompress';
import { X, ImagePlus, Trash2 } from 'lucide-react';
import './ClientForm.css';

const INITIAL = {
  clientName: '',
  institution: '',
  contactNumber: '',
  email: '',
  website: '',
  address: '',
  notes: '',
  imageBase64: '',
  active: true,
};

export function ClientForm({ userId, editingClient, onClose }) {
  const [form, setForm] = useState(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [imageCompressing, setImageCompressing] = useState(false);
  const fileInputRef = useRef(null);

  const isEdit = Boolean(editingClient?.id);

  useEffect(() => {
    if (editingClient) {
      setForm({
        clientName: editingClient.clientName || '',
        institution: editingClient.institution || '',
        contactNumber: editingClient.contactNumber || '',
        email: editingClient.email || '',
        website: editingClient.website || '',
        address: editingClient.address || '',
        notes: editingClient.notes || '',
        imageBase64: editingClient.imageBase64 || '',
        active: editingClient.active !== false,
      });
    } else {
      setForm(INITIAL);
    }
  }, [editingClient]);

  function update(field) {
    return (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setImageCompressing(true);
    setError('');
    try {
      const base64 = await compressImageToBase64(file, { maxDimension: 800, quality: 0.7 });
      setForm((prev) => ({ ...prev, imageBase64: base64 }));
    } catch (err) {
      setError(err.message || 'Failed to process image');
    } finally {
      setImageCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleRemoveImage() {
    setForm((prev) => ({ ...prev, imageBase64: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const name = form.clientName.trim();
    if (!name) {
      setError('Client name is required.');
      return;
    }
    setSaving(true);
    try {
      const data = {
        clientName: name,
        institution: form.institution.trim(),
        contactNumber: form.contactNumber.trim(),
        email: form.email.trim(),
        website: form.website.trim(),
        address: form.address.trim(),
        notes: form.notes.trim(),
        imageBase64: form.imageBase64 || '',
        active: form.active,
      };
      if (isEdit) {
        await updateClient(editingClient.id, data);
      } else {
        await addClient(userId, data);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save client');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal-content modal-content--client" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Client' : 'Add Client'}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="payment-form client-form">
          {error && <div className="form-error">{error}</div>}
          <div className="client-form__fields">
            <label className="form-label client-form__field--full">
              Client Name *
              <input
                type="text"
                value={form.clientName}
                onChange={update('clientName')}
                className="form-input"
                required
                placeholder="e.g. Adnan, Rafy"
              />
            </label>
            <div className="form-label client-form-image client-form__field--full">
              <span className="client-form-image-label">Photo / Logo</span>
              <div className="client-form-image-area">
                {form.imageBase64 ? (
                  <div className="client-form-image-preview-wrap">
                    <img src={form.imageBase64} alt="" className="client-form-image-preview" />
                    <button
                      type="button"
                      className="btn btn-small btn-secondary client-form-image-remove"
                      onClick={handleRemoveImage}
                      aria-label="Remove image"
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="client-form-image-upload">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      disabled={imageCompressing}
                      className="client-form-image-input"
                    />
                    <span className="client-form-image-upload-text">
                      {imageCompressing ? 'Compressing…' : (
                        <>
                          <ImagePlus size={20} />
                          Choose image (compressed before save)
                        </>
                      )}
                    </span>
                  </label>
                )}
              </div>
            </div>
            <label className="form-label">
              Institution
              <input
                type="text"
                value={form.institution}
                onChange={update('institution')}
                className="form-input"
                placeholder="Company name or individual"
              />
            </label>
            <label className="form-label">
              Contact Number
              <input
                type="tel"
                value={form.contactNumber}
                onChange={update('contactNumber')}
                className="form-input"
                placeholder="e.g. +880 1XXX-XXXXXX"
              />
            </label>
            <label className="form-label">
              Email
              <input
                type="email"
                value={form.email}
                onChange={update('email')}
                className="form-input"
                placeholder="client@example.com"
              />
            </label>
            <label className="form-label">
              Website
              <input
                type="url"
                value={form.website}
                onChange={update('website')}
                className="form-input"
                placeholder="https://example.com"
              />
            </label>
            <label className="form-label client-form__field--full">
              Address
              <input
                type="text"
                value={form.address}
                onChange={update('address')}
                className="form-input"
                placeholder="Street, city, area"
              />
            </label>
            <label className="form-label client-form__field--full">
              Notes
              <textarea
                value={form.notes}
                onChange={update('notes')}
                className="form-input form-input--textarea"
                placeholder="Extra details, preferences, etc."
                rows={3}
              />
            </label>
            <label className="form-label form-check client-form__field--full">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
                className="form-input"
              />
              <span>
                Active client
                <span className="form-hint">Inactive clients are hidden from the Add job client dropdown.</span>
              </span>
            </label>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Update' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

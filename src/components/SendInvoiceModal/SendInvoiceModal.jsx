import { useState, useEffect, useMemo } from 'react';
import { X, Send, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { formatAmount } from '../../utils/format';
import './SendInvoiceModal.css';

export function SendInvoiceModal({ client, jobs: initialJobs, totalPaidByJob = {}, onClose }) {
  const [selectedJobIds, setSelectedJobIds] = useState(new Set());
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const { profile } = useAuth();

  const jobs = useMemo(() => (initialJobs || []).filter(j => j.status !== 'Paid'), [initialJobs]);

  useEffect(() => {
    // Select all by default if there are jobs
    if (jobs && jobs.length > 0) {
      setSelectedJobIds(new Set(jobs.map(j => j.id)));
    }
  }, [jobs]);

  function toggleJob(id) {
    setSelectedJobIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selectedJobIds.size === jobs.length) {
      setSelectedJobIds(new Set());
    } else {
      setSelectedJobIds(new Set(jobs.map(j => j.id)));
    }
  }

  async function handleSendEmail() {
    if (selectedJobIds.size === 0) return;

    // Check missing email early
    if (!client.email) {
      setError("Cannot send: Client has no email address configured.");
      return;
    }

    setIsSending(true);
    setError(null);

    const selectedJobs = jobs.filter(j => selectedJobIds.has(j.id));
    const subject = `Invoice${selectedJobs.length > 1 ? 's' : ''} from ${profile?.businessName || 'Us'}`;
    const currency = selectedJobs[0]?.currency ?? 'BDT';

    const formattedDate = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

    let subtotal = 0;
    let totalPaid = 0;
    let itemsHtml = '';

    selectedJobs.forEach(job => {
      const desc = job.workDescription || 'Job';
      const amountStr = formatAmount(job.amount, currency);
      const indUrl = `${window.location.origin}/invoice/${job.id}`;
      itemsHtml += `
        <tr>
          <td style="padding: 1.75rem 1rem; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
            <strong style="display: block; font-size: 1.125rem; margin-bottom: 0.5rem; color: #0f172a;">${desc}</strong>
            <a href="${indUrl}" style="color: #64748b; font-size: 12px; text-decoration: underline;">View Individual Invoice</a>
          </td>
          <td style="padding: 1.75rem 1rem; border-bottom: 1px solid #f1f5f9; vertical-align: top; text-align: right; font-weight: 600; color: #000000;">
            ${amountStr} ${currency}
          </td>
        </tr>
      `;

      subtotal += Number(job.amount) || 0;
      totalPaid += Number(totalPaidByJob[job.id] || 0);
    });

    const balanceDue = Math.max(0, subtotal - totalPaid);
    const isPaidInFull = balanceDue === 0;

    const jobIdsStr = selectedJobs.map(j => j.id).join(',');
    const url = `${window.location.origin}/invoice/${jobIdsStr}`;

    const htmlBody = `
      <div style="font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; padding: 40px 10px;">
        <div style="max-width: 800px; margin: 0 auto; background: #ffffff; padding: 4.5rem; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.02); position: relative; overflow: hidden; color: #000000;">
          
          ${isPaidInFull ? `
          <div style="position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-15deg); font-size: 4rem; font-weight: 900; color: rgba(16, 185, 129, 0.15); border: 8px solid rgba(16, 185, 129, 0.15); padding: 1rem 2rem; border-radius: 16px; text-transform: uppercase; letter-spacing: 4px; pointer-events: none; z-index: 0;">
            PAID IN FULL
          </div>` : ''}

          <table style="width: 100%; margin-bottom: 3.5rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 2rem; position: relative; z-index: 10;">
            <tr>
              <td style="vertical-align: top;">
                <h1 style="font-size: 2.75rem; font-weight: 900; margin: 0 0 0.5rem; color: #0d9488; letter-spacing: 3px;">INVOICE</h1>
                <div style="margin-top: 0.25rem;">
                  <p style="font-size: 1.125rem; color: #64748b; margin: 0 0 0.25rem 0; font-weight: 700;">${profile?.businessName || 'Your Business'}</p>
                  ${profile?.address ? `<p style="font-size: 0.9375rem; color: #64748b; margin: 0 0 0.15rem 0; font-weight: 500; white-space: pre-wrap;">${profile.address}</p>` : ''}
                  ${profile?.phone ? `<p style="font-size: 0.9375rem; color: #64748b; margin: 0 0 0.15rem 0; font-weight: 500;">${profile.phone}</p>` : ''}
                  ${profile?.email ? `<p style="font-size: 0.9375rem; color: #64748b; margin: 0 0 0.15rem 0; font-weight: 500;">${profile.email}</p>` : ''}
                </div>
              </td>
              <td style="vertical-align: top; text-align: right;">
                <div style="font-size: 0.9375rem; margin-bottom: 0.5rem;">
                  <span style="font-weight: 600; color: #64748b; display: inline-block; width: 100px; margin-right: 1rem;">Date:</span>
                  <span style="font-weight: 500; display: inline-block; width: 120px; text-align: left;">${formattedDate}</span>
                </div>
              </td>
            </tr>
          </table>
          
          <div style="margin-bottom: 3rem; position: relative; z-index: 10;">
            <h2 style="font-size: 1rem; font-weight: 700; color: #64748b; text-transform: uppercase; margin: 0 0 1rem 0;">Bill To:</h2>
            <div>
              <p style="font-size: 1.25rem; font-weight: 700; margin: 0 0 0.5rem 0;">${client.clientName}</p>
              ${client.institution ? `<p style="font-weight: 600; color: #475569; margin: 0 0 0.25rem 0; font-size: 1rem;">${client.institution}</p>` : ''}
              ${client.address ? `<p style="color: #475569; margin: 0 0 0.25rem 0; font-size: 1rem;">${client.address}</p>` : ''}
              ${client.contactNumber ? `<p style="color: #475569; margin: 0 0 0.25rem 0; font-size: 1rem;">${client.contactNumber}</p>` : ''}
              ${client.email ? `<p style="color: #475569; margin: 0 0 0.25rem 0; font-size: 1rem;">${client.email}</p>` : ''}
            </div>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 3rem; position: relative; z-index: 10;">
            <thead>
              <tr>
                <th style="background: #f8fafc; color: #475569; padding: 1.25rem 1rem; font-weight: 700; text-align: left; text-transform: uppercase; font-size: 0.8125rem; letter-spacing: 1px; border-bottom: 2px solid #cbd5e1;">Description</th>
                <th style="background: #f8fafc; color: #475569; padding: 1.25rem 1rem; font-weight: 700; text-align: right; text-transform: uppercase; font-size: 0.8125rem; letter-spacing: 1px; border-bottom: 2px solid #cbd5e1; width: 30%;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <table style="width: 100%; position: relative; z-index: 10;">
            <tr>
              <td style="width: 50%;"></td>
              <td style="width: 50%;">
                <div style="border-top: 2px solid #e2e8f0; padding-top: 1rem;">
                  <div style="display: table; width: 100%; margin-bottom: 1rem; font-size: 1rem;">
                    <div style="display: table-cell; font-weight: 600; color: #64748b;">Subtotal:</div>
                    <div style="display: table-cell; font-weight: 600; text-align: right;">${formatAmount(subtotal, currency)} ${currency}</div>
                  </div>
                  <div style="display: table; width: 100%; margin-bottom: 1rem; font-size: 1rem;">
                    <div style="display: table-cell; font-weight: 600; color: #64748b;">Amount Paid:</div>
                    <div style="display: table-cell; font-weight: 600; text-align: right;">${formatAmount(totalPaid, currency)} ${currency}</div>
                  </div>
                  <div style="display: table; width: 100%; margin-top: 0.75rem; background: #f8fafc; padding: 1.25rem; border-radius: 8px; font-size: 1.25rem; font-weight: 800; color: #0d9488; box-sizing: border-box;">
                    <div style="display: table-cell; vertical-align: middle;">Balance Due:</div>
                    <div style="display: table-cell; text-align: right; vertical-align: middle;">${formatAmount(balanceDue, currency)} ${currency}</div>
                  </div>
                </div>
              </td>
            </tr>
          </table>
          
          <div style="margin-top: 4rem; text-align: center; color: #64748b; font-size: 0.9375rem; border-top: 1px solid #e2e8f0; padding-top: 2rem; position: relative; z-index: 10;">
            <p style="margin: 0 0 1.5rem 0; font-size: 1rem; color: #334155;">Thank you for your business!</p>
            <div style="background: #f8fafc; padding: 1.5rem; border-radius: 8px;">
              <p style="margin: 0 0 0.5rem 0; font-size: 0.8125rem; color: #64748b;">
                This invoice was generated securely by <strong>ClientKhata</strong>.
              </p>
              <p style="margin: 0; font-size: 0.75rem;">
                <a href="${window.location.origin}" style="color: #94a3b8; text-decoration: underline;">ClientKhata</a>
                <span style="color: #cbd5e1; margin: 0 8px;">|</span>
                <a href="mailto:${profile?.email || 'stop'}?subject=Unsubscribe%20Request" style="color: #94a3b8; text-decoration: underline;">Unsubscribe</a>
              </p>
            </div>
          </div>
          
        </div>
      </div>
    `;

    try {
      const response = await fetch(import.meta.env.VITE_EMAIL_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_EMAIL_API_KEY
        },
        body: JSON.stringify({
          to: client.email,
          from: profile?.businessName || "Sami",
          subject: subject,
          message: htmlBody
        })
      });

      if (!response.ok) {
        throw new Error("Failed API status");
      }

      onClose(); // Automatically close when finished rendering without error
    } catch (err) {
      console.error(err);
      setError("Failed to send email. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="send-invoice-overlay" onClick={onClose} role="presentation">
      <div className="send-invoice-content" onClick={e => e.stopPropagation()} role="dialog">
        <div className="send-invoice-header">
          <h2 className="modal-title">
            <Mail size={20} className="modal-title-icon" />
            Send Invoices
          </h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="send-invoice-body">
          {error && (
            <div className="send-invoice-warning">
              {error}
            </div>
          )}
          {!client.email && !error && (
            <div className="send-invoice-warning">
              This client has no email address set. You must add one before sending.
            </div>
          )}
          <p className="send-invoice-desc">Select the jobs you want to include in the email.</p>

          <div className="send-invoice-list">
            <label className="send-invoice-item send-invoice-item--all">
              <input
                type="checkbox"
                className="form-input"
                checked={jobs.length > 0 && selectedJobIds.size === jobs.length}
                onChange={toggleAll}
              />
              <span>Select All</span>
            </label>

            {jobs.map(job => (
              <label key={job.id} className="send-invoice-item">
                <input
                  type="checkbox"
                  className="form-input"
                  checked={selectedJobIds.has(job.id)}
                  onChange={() => toggleJob(job.id)}
                />
                <div className="send-invoice-item__info">
                  <span className="send-invoice-item__desc">{job.workDescription || 'Unnamed Job'}</span>
                  <span className="send-invoice-item__amount">{formatAmount(job.amount, job.currency ?? 'BDT')}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
        <div className="send-invoice-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSending}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={selectedJobIds.size === 0 || !client.email || isSending}
            onClick={handleSendEmail}
          >
            <Send size={16} />
            {isSending ? 'Sending...' : 'Send HTML Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}

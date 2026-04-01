import { useState, useEffect, useMemo } from "react";
import { X, Send, Mail } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { formatAmount } from "../../utils/format";
import { getGlobalEncryptionKey, deriveInvoiceKey } from "../../utils/encryption";
import "./SendInvoiceModal.css";

export function SendInvoiceModal({
  client,
  jobs: initialJobs,
  totalPaidByJob = {},
  onClose,
}) {
  const [selectedJobIds, setSelectedJobIds] = useState(new Set());
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [customMessage, setCustomMessage] = useState(
    "Thank you for your business!",
  );
  const { profile, user } = useAuth();
  const fallbackName =
    user?.displayName || user?.email?.split("@")[0] || "User";

  const jobs = useMemo(
    () => (initialJobs || []).filter((j) => j.status !== "Paid"),
    [initialJobs],
  );

  useEffect(() => {
    // Select all by default if there are jobs
    if (jobs && jobs.length > 0) {
      setSelectedJobIds(new Set(jobs.map((j) => j.id)));
    }
  }, [jobs]);

  function toggleJob(id) {
    setSelectedJobIds((prev) => {
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
      setSelectedJobIds(new Set(jobs.map((j) => j.id)));
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
    setSuccessMsg(null);

    const selectedJobs = jobs.filter((j) => selectedJobIds.has(j.id));
    const subject = `Invoice${selectedJobs.length > 1 ? "s" : ""} from ${profile?.businessName || `${fallbackName}`}`;
    const currency = selectedJobs[0]?.currency ?? "BDT";

    const formattedDate = new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let subtotal = 0;
    let totalPaid = 0;
    let itemsHtml = "";

    selectedJobs.forEach((job) => {
      const desc = job.workDescription || "Job";
      const amountStr = formatAmount(job.amount, currency);
      const dek = getGlobalEncryptionKey();
      const key = dek ? deriveInvoiceKey(job.id, dek) : '';
      const indUrl = `${window.location.origin}/invoice/${job.id}${key ? `#key=${key}` : ''}`;
      itemsHtml += `
        <tr>
          <td class="td-pad" style="padding: 28px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: top;">
            <strong style="display: block; font-size: 18px; margin-bottom: 8px; color: #0f172a;">${desc}</strong>
            <a href="${indUrl}" style="color: #64748b; font-size: 12px; text-decoration: underline;">View Individual Invoice</a>
          </td>
          <td class="td-pad" style="padding: 28px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: top; text-align: right; font-weight: 600; color: #000000;">
            ${amountStr} ${currency}
          </td>
        </tr>
      `;

      subtotal += Number(job.amount) || 0;
      totalPaid += Number(totalPaidByJob[job.id] || 0);
    });

    const balanceDue = Math.max(0, subtotal - totalPaid);
    const isPaidInFull = balanceDue === 0;

    const jobIdsStr = selectedJobs.map((j) => j.id).join(",");
    const url = `${window.location.origin}/invoice/${jobIdsStr}`;

    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <style>
          @media only screen and (max-width: 600px) {
            .main-container { padding: 20px !important; }
            .header-title { font-size: 28px !important; }
            .paid-stamp { font-size: 36px !important; padding: 10px !important; white-space: nowrap !important; }
            .stack-column { display: block !important; width: 100% !important; text-align: left !important; box-sizing: border-box !important; }
            .text-right-mobile { text-align: left !important; margin-top: 16px !important; }
            .td-pad { padding: 15px 10px !important; }
            .mobile-full-width { width: 100% !important; display: block !important; }
            .mobile-margin-bottom { margin-bottom: 24px !important; }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; color: #000000;">
        <div style="padding: 40px 10px;">
          <div class="main-container" style="max-width: 800px; margin: 0 auto; background: #ffffff; padding: 72px; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.02); position: relative; overflow: hidden;">
            
            ${
              isPaidInFull
                ? `
            <div class="paid-stamp" style="position: absolute; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-15deg); font-size: 64px; font-weight: 900; color: rgba(16, 185, 129, 0.15); border: 8px solid rgba(16, 185, 129, 0.15); padding: 16px 32px; border-radius: 16px; text-transform: uppercase; letter-spacing: 4px; pointer-events: none; z-index: 0;">
              PAID IN FULL
            </div>`
                : ""
            }

            <table width="100%" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 56px; border-bottom: 2px solid #f1f5f9; padding-bottom: 32px; position: relative; z-index: 10;">
              <tr>
                <td class="stack-column" style="vertical-align: top;">
                  <h1 class="header-title" style="font-size: 44px; font-weight: 900; margin: 0 0 8px; color: #0d9488; letter-spacing: 3px;">INVOICE</h1>
                  <div style="margin-top: 4px;">
                    <p style="font-size: 18px; color: #64748b; margin: 0 0 4px 0; font-weight: 700;">${profile?.businessName || fallbackName}</p>
                    ${profile?.address ? `<p style="font-size: 15px; color: #64748b; margin: 0 0 2px 0; font-weight: 500; white-space: pre-wrap;">${profile.address}</p>` : ""}
                    ${profile?.phone ? `<p style="font-size: 15px; color: #64748b; margin: 0 0 2px 0; font-weight: 500;">${profile.phone}</p>` : ""}
                    ${profile?.email ? `<p style="font-size: 15px; color: #64748b; margin: 0 0 2px 0; font-weight: 500;">${profile.email}</p>` : ""}
                  </div>
                </td>
                <td class="stack-column text-right-mobile" style="vertical-align: top; text-align: right;">
                  <div style="font-size: 15px; margin-bottom: 8px;">
                    <span style="font-weight: 600; color: #64748b; display: inline-block; width: 60px; margin-right: 8px; text-align: left;">Date:</span>
                    <span style="font-weight: 500; display: inline-block; width: 120px; text-align: left;">${formattedDate}</span>
                  </div>
                </td>
              </tr>
            </table>
            
            <div style="margin-bottom: 48px; position: relative; z-index: 10;">
              <h2 style="font-size: 16px; font-weight: 700; color: #64748b; text-transform: uppercase; margin: 0 0 16px 0;">Bill To:</h2>
              <div>
                <p style="font-size: 20px; font-weight: 700; margin: 0 0 8px 0;">${client.clientName}</p>
                ${client.institution ? `<p style="font-weight: 600; color: #475569; margin: 0 0 4px 0; font-size: 16px;">${client.institution}</p>` : ""}
                ${client.address ? `<p style="color: #475569; margin: 0 0 4px 0; font-size: 16px;">${client.address}</p>` : ""}
                ${client.contactNumber ? `<p style="color: #475569; margin: 0 0 4px 0; font-size: 16px;">${client.contactNumber}</p>` : ""}
                ${client.email ? `<p style="color: #475569; margin: 0 0 4px 0; font-size: 16px;">${client.email}</p>` : ""}
              </div>
            </div>
            
            <table width="100%" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse; margin-bottom: 48px; position: relative; z-index: 10;">
              <thead>
                <tr>
                  <th style="background: #f8fafc; color: #475569; padding: 20px 16px; font-weight: 700; text-align: left; text-transform: uppercase; font-size: 13px; letter-spacing: 1px; border-bottom: 2px solid #cbd5e1;">Description</th>
                  <th style="background: #f8fafc; color: #475569; padding: 20px 16px; font-weight: 700; text-align: right; text-transform: uppercase; font-size: 13px; letter-spacing: 1px; border-bottom: 2px solid #cbd5e1; width: 30%;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <table width="100%" cellpadding="0" cellspacing="0" style="width: 100%; position: relative; z-index: 10;">
              <tr>
                <td class="stack-column mobile-margin-bottom" style="width: 50%;"></td>
                <td class="stack-column mobile-full-width" style="width: 50%;">
                  <div style="border-top: 2px solid #e2e8f0; padding-top: 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="width: 100%; margin-bottom: 16px; font-size: 16px;">
                      <tr>
                        <td style="font-weight: 600; color: #64748b; padding-bottom: 8px;">Subtotal:</td>
                        <td style="font-weight: 600; text-align: right; padding-bottom: 8px;">${formatAmount(subtotal, currency)} ${currency}</td>
                      </tr>
                      <tr>
                        <td style="font-weight: 600; color: #64748b;">Amount Paid:</td>
                        <td style="font-weight: 600; text-align: right;">${formatAmount(totalPaid, currency)} ${currency}</td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="width: 100%; margin-top: 12px; background: #f8fafc; border-radius: 8px; font-size: 20px; font-weight: 800; color: #0d9488;">
                      <tr>
                        <td style="padding: 20px 16px; vertical-align: middle; border-radius: 8px 0 0 8px;">Balance Due:</td>
                        <td style="padding: 20px 16px; text-align: right; vertical-align: middle; border-radius: 0 8px 8px 0;">${formatAmount(balanceDue, currency)} ${currency}</td>
                      </tr>
                    </table>
                  </div>
                </td>
              </tr>
            </table>
            
            <div style="margin-top: 64px; text-align: center; color: #64748b; font-size: 15px; border-top: 1px solid #e2e8f0; padding-top: 32px; position: relative; z-index: 10;">
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #334155;">${customMessage.replace(/\n/g, "<br/>")}</p>
              <div style="background: #f8fafc; padding: 24px; border-radius: 8px;">
                <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b;">
                  This invoice was generated securely by <strong>ClientKhata</strong>.
                </p>
                <p style="margin: 0; font-size: 12px;">
                  <a href="${window.location.origin}" style="color: #94a3b8; text-decoration: underline;">ClientKhata</a>
                  <span style="color: #cbd5e1; margin: 0 8px;">|</span>
                  <a href="mailto:${profile?.email || "stop"}?subject=Unsubscribe%20Request" style="color: #94a3b8; text-decoration: underline;">Unsubscribe</a>
                </p>
              </div>
            </div>
            
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      const response = await fetch(import.meta.env.VITE_EMAIL_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_EMAIL_API_KEY,
        },
        body: JSON.stringify({
          to: client.email,
          from: profile?.businessName || fallbackName,
          subject: subject,
          message: htmlBody,
        }),
      });

      const data = await response.json().catch(() => ({}));
      console.log("Email API Response:", {
        status: response.status,
        ok: response.ok,
        data,
      });

      if (!response.ok || data.status === "error" || data.status >= 400) {
        throw new Error(data.message || data.details || "Failed to send email");
      }

      setSuccessMsg(data.message || data.details || "Email sent successfully!");
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to send email. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="send-invoice-overlay" onClick={onClose} role="presentation">
      <div
        className="send-invoice-content"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        <div className="send-invoice-header">
          <h2 className="modal-title">
            <Mail size={20} className="modal-title-icon" />
            Send Invoices
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
        <div className="send-invoice-body">
          {error && <div className="send-invoice-warning">{error}</div>}
          {successMsg && (
            <div className="send-invoice-success">{successMsg}</div>
          )}
          {!client.email && !error && !successMsg && (
            <div className="send-invoice-warning">
              This client has no email address set. You must add one before
              sending.
            </div>
          )}
          <p className="send-invoice-desc">
            Select the jobs you want to include in the email.
          </p>

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

            {jobs.map((job) => (
              <label key={job.id} className="send-invoice-item">
                <input
                  type="checkbox"
                  className="form-input"
                  checked={selectedJobIds.has(job.id)}
                  onChange={() => toggleJob(job.id)}
                />
                <div className="send-invoice-item__info">
                  <span className="send-invoice-item__desc">
                    {job.workDescription || "Unnamed Job"}
                  </span>
                  <span className="send-invoice-item__amount">
                    {formatAmount(job.amount, job.currency ?? "BDT")}
                  </span>
                </div>
              </label>
            ))}
          </div>

          <div className="send-invoice-form-group">
            <label className="send-invoice-label">Custom Message</label>
            <textarea
              className="form-input send-invoice-textarea"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Enter a custom message... (Default: Thank you for your business!)"
            />
          </div>
        </div>
        <div className="send-invoice-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isSending || !!successMsg}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={
              selectedJobIds.size === 0 ||
              !client.email ||
              isSending ||
              !!successMsg
            }
            onClick={handleSendEmail}
          >
            <Send size={16} />
            {isSending ? "Sending..." : "Send Invoice"}
          </button>
        </div>
      </div>
    </div>
  );
}

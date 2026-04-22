import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getPublicInvoice, syncInvoiceData } from '../../firebase/invoices';
import { subscribePayments } from '../../firebase/payments';
import { subscribePaymentRecords } from '../../firebase/paymentRecords';
import { subscribeClients } from '../../firebase/clients';
import { formatAmount } from '../../utils/format';
import { getGlobalEncryptionKey, deriveInvoiceKey, decryptData } from '../../utils/encryption';
import { ArrowLeft, Printer, Link as LinkIcon, Check, ShieldAlert } from 'lucide-react';
import { PageLoader } from '../PageLoader/PageLoader';
import { resolveBackLink } from '../../utils/navBack';
import './JobInvoicePage.css';

export function JobInvoicePage() {
  const { jobId } = useParams();
  const location = useLocation();
  const jobBack = resolveBackLink(location, {
    pathname: jobId ? `/job/${jobId}` : '/jobs',
    label: jobId ? 'Job' : 'Jobs',
  });
  const dashBack = resolveBackLink(location, { pathname: '/dashboard', label: 'Home' });
  const { user, profile, loading: authLoading } = useAuth();
  
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const generatingRef = useRef(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // 1. Fetch public invoice snapshot
  useEffect(() => {
    let active = true;
    async function fetchInvoice() {
      try {
        const inv = await getPublicInvoice(jobId);
        if (active) {
          if (inv) {
            setInvoice(inv);
            if (!inv.encryptedPayload) {
              setLoading(false);
            }
          } else {
            setLoading(false);
          }
        }
      } catch (err) {
        if (active) {
          console.error(err);
          setError('Failed to load invoice.');
          setLoading(false);
        }
      }
    }
    fetchInvoice();
    return () => { active = false; };
  }, [jobId]);

  // 1.5 Decrypt payload if needed
  useEffect(() => {
    if (!invoice || !invoice.encryptedPayload || invoice.decrypted) return;
    
    let key = window.location.hash.replace('#key=', '');
    
    if (!key && !authLoading && user?.uid === invoice.userId) {
       const dek = getGlobalEncryptionKey();
       if (dek) {
         key = deriveInvoiceKey(jobId, dek);
         if (key) {
           window.history.replaceState(null, '', `#key=${key}`);
         }
       }
    }

    if (key) {
      try {
        const decryptedStr = decryptData(invoice.encryptedPayload, key);
        if (decryptedStr !== invoice.encryptedPayload) {
          const parsed = JSON.parse(decryptedStr);
          setInvoice(prev => ({ ...prev, ...parsed, decrypted: true }));
          setLoading(false);
        } else {
          setError('Incorrect encryption key.');
          setLoading(false);
        }
      } catch (e) {
        console.error(e);
        setError('Failed to decrypt invoice.');
        setLoading(false);
      }
    } else if (!authLoading) {
      setError('Encryption key is missing from the URL.');
      setLoading(false);
    }
  }, [invoice, authLoading, user?.uid, jobId]);

  // 2. Generate on-the-fly for the owner if it does not exist OR if it is corrupted
  useEffect(() => {
    const isCorrupted = invoice && invoice.decrypted && 
                       (!invoice.client?.name || invoice.client?.name === 'Unknown Client') && 
                       (!invoice.job?.amount || invoice.job?.amount === 0);
                       
    if (!loading && (!invoice || isCorrupted) && !authLoading && user?.uid && !error) {
      if (generatingRef.current) return;
      generatingRef.current = true;
      setGenerating(true);
      const uid = user.uid;
      let pLoaded = false, cLoaded = false, rLoaded = false;
      let pList = [], cList = [], rList = [];
      let unsubs = [];
      
      const cleanup = () => {
        unsubs.forEach(fn => { if (typeof fn === 'function') fn(); });
        unsubs = [];
      };

      const checkAndGenerate = async () => {
        if (pLoaded && cLoaded && rLoaded) {
          cleanup(); // Stop listening as soon as we have all data
          
          const job = pList.find(j => j.id === jobId);
          if (job) {
            const client = cList.find(c => c.id === job.clientId);
            const records = rList.filter(r => r.jobId === jobId);
            
            try {
              await syncInvoiceData(jobId, uid, user.displayName, job, client, records, profile);
              const newInv = await getPublicInvoice(jobId);
              setInvoice(newInv);
              if (!newInv.encryptedPayload) setLoading(false);
            } catch (err) {
              console.error(err);
              setError('Failed to generate invoice.');
            }
          } else {
            setError('Job not found.');
          }
          generatingRef.current = false;
          setGenerating(false);
        }
      };

      unsubs.push(subscribePayments(uid, list => { pList = list; pLoaded = true; checkAndGenerate(); }));
      unsubs.push(subscribeClients(uid, list => { cList = list; cLoaded = true; checkAndGenerate(); }));
      unsubs.push(subscribePaymentRecords(uid, list => { rList = list; rLoaded = true; checkAndGenerate(); }));
      
      return cleanup;
    }
  }, [loading, invoice, authLoading, user?.uid, jobId, error, profile]);

  if (loading || generating) {
    return (
      <div className="invoice-page invoice-loading">
        <PageLoader text={generating ? 'Generating Public Invoice...' : 'Loading Invoice...'} />
      </div>
    );
  }

  if (error || (!invoice && !loading && !generating)) {
    return (
      <div className="invoice-wrapper page">
        <div className="invoice-error-container">
          <div className="invoice-error-icon">
            <ShieldAlert size={40} strokeWidth={2.5} />
          </div>
          <h2 className="invoice-error-title">Invoice Access Denied</h2>
          <p className="invoice-error-desc">
            Secure access to this invoice is currently unavailable. Please ask the business owner to provide a valid secure link.
          </p>
          {user?.uid && (
            <div className="invoice-error-actions">
              <Link to={dashBack.to} className="btn btn-primary">Back to {dashBack.label}</Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  const handlePrint = () => window.print();

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  let formattedDate;
  if (invoice.createdAt?.toDate) {
    try {
      formattedDate = invoice.createdAt.toDate().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (_) {
      formattedDate = new Date().toLocaleDateString();
    }
  } else if (invoice.createdAt) {
    try {
      formattedDate = new Date(invoice.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (_) {
      formattedDate = new Date().toLocaleDateString();
    }
  } else {
    formattedDate = new Date().toLocaleDateString();
  }
  
  const curr = invoice.currency;

  return (
    <div className="invoice-wrapper page">
      <div className="invoice-toolbar no-print">
        {user?.uid ? (
          <Link to={jobBack.to} className="btn btn-secondary">
            <ArrowLeft size={18} />
            Back to {jobBack.label}
          </Link>
        ) : (
          <div /> // Spacer for guests
        )}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button type="button" className="btn btn-secondary" onClick={handleShare}>
            {copied ? <Check size={18} /> : <LinkIcon size={18} />}
            {copied ? 'Copied' : 'Copy Link'}
          </button>
          <button type="button" className="btn btn-primary" onClick={handlePrint}>
            <Printer size={18} />
            Print
          </button>
        </div>
      </div>

      <div className="invoice-container">
        <header className="invoice-header">
          <div className="invoice-header-brand">
            <h1 className="invoice-title">INVOICE</h1>
            {invoice.business ? (
              <div className="invoice-business-details">
                <p className="invoice-business-name">{invoice.business.name}</p>
                {invoice.business.address && <p className="business-contact">{invoice.business.address}</p>}
                {invoice.business.phone && <p className="business-contact">{invoice.business.phone}</p>}
                {invoice.business.email && <p className="business-contact">{invoice.business.email}</p>}
              </div>
            ) : (
              <p className="invoice-business-name">{invoice.businessName}</p>
            )}
          </div>
          <div className="invoice-header-meta">
            <div className="invoice-meta-item">
              <span className="meta-label">Date:</span>
              <span className="meta-value">{formattedDate}</span>
            </div>
          </div>
        </header>

        <section className="invoice-bill-to">
          <h2 className="bill-to-title">Bill To:</h2>
          <div className="bill-to-details">
            <p className="client-name">{invoice.client?.name}</p>
            {invoice.client?.institution && <p className="client-institution">{invoice.client.institution}</p>}
            {invoice.client?.address && <p className="client-address">{invoice.client.address}</p>}
            {invoice.client?.contactNumber && <p className="client-contact">{invoice.client.contactNumber}</p>}
            {invoice.client?.email && <p className="client-contact">{invoice.client.email}</p>}
          </div>
        </section>

        <section className="invoice-items">
          <table className="invoice-table">
            <thead>
              <tr>
                <th className="th-desc">Description</th>
                <th className="th-amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="td-desc">
                  <strong>{invoice.job?.workDescription}</strong>
                  {invoice.job?.notes && <div className="item-notes">{invoice.job.notes}</div>}
                </td>
                <td className="td-amount">{formatAmount(invoice.job?.amount, curr)} {curr}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="invoice-summary">
          <div className="summary-row">
            <span className="summary-label">Subtotal:</span>
            <span className="summary-value">{formatAmount(invoice.summary?.subtotal, curr)} {curr}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Amount Paid:</span>
            <span className="summary-value">{formatAmount(invoice.summary?.totalPaid, curr)} {curr}</span>
          </div>
          <div className="summary-row summary-total">
            <span className="summary-label">Balance Due:</span>
            <span className="summary-value">{formatAmount(invoice.summary?.balanceDue, curr)} {curr}</span>
          </div>
        </section>

        {invoice.summary?.balanceDue === 0 && (
          <div className="invoice-stamp paid-stamp">
            PAID IN FULL
          </div>
        )}

        <footer className="invoice-footer">
          <p>Thank you for your business!</p>
        </footer>
      </div>
    </div>
  );
}

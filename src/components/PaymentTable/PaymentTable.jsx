import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatAmount, getStatusBadgeClass, formatTimestamp } from '../../utils/format';
import { JOB_STATUSES } from '../../schema/paymentSchema';
import { Search, Pencil, Trash2, Eye } from 'lucide-react';
import './PaymentTable.css';

/**
 * Group payments by clientId (first row in each group shows client name).
 */
function groupByClient(payments) {
  const seen = new Set();
  return payments.map((payment) => {
    const key = payment.clientId || '';
    const isFirst = key ? !seen.has(key) : true;
    if (key) seen.add(key);
    return { groupKey: key, isFirst, payment };
  });
}

export function PaymentTable({ payments, onEdit, onDelete }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const filtered = useMemo(() => {
    let list = payments;
    const s = search.trim().toLowerCase();
    if (s) {
      list = list.filter(
        (p) =>
          (p.clientName || '').toLowerCase().includes(s) ||
          (p.workDescription || '').toLowerCase().includes(s)
      );
    }
    if (filterStatus) {
      list = list.filter((p) => (p.status || '') === filterStatus);
    }
    return list;
  }, [payments, search, filterStatus]);

  const rows = useMemo(() => groupByClient(filtered), [filtered]);

  function getStatusTimestamp(payment) {
    const status = payment.status;
    if (status === 'Pending') return payment.pendingAt;
    if (status === 'Ongoing') return payment.ongoingAt;
    if (status === 'Delivered') return payment.deliveredAt;
    if (status === 'Paid') return payment.paidAt;
    return null;
  }

  return (
    <div className="payment-table-wrapper">
      <div className="table-toolbar">
        <span className="table-search-wrap">
          <Search size={18} className="table-search__icon" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search by client or job description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="table-search"
          />
        </span>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="table-filter"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="table-scroll">
        <table className="payment-table">
          <thead>
            <tr>
              <th className="col-client">Client</th>
              <th className="col-job">Job description</th>
              <th className="col-amount">Amount</th>
              <th className="col-status">Status</th>
              <th className="col-delivered">Delivered</th>
              <th className="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="table-empty">
                  {filtered.length === 0 && payments.length === 0
                    ? 'No jobs yet. Add a client, then add a job.'
                    : 'No jobs match your filters.'}
                </td>
              </tr>
            ) : (
              rows.map(({ isFirst, payment }, index) => (
                <tr key={payment.id} className={index % 2 === 1 ? 'row-alt' : ''}>
                  <td className="col-client">
                    {isFirst ? (payment.clientName || '—') : ''}
                  </td>
                  <td className="col-job">
                    {payment.workDescription || '—'}
                  </td>
                  <td className="col-amount">{formatAmount(payment.amount, payment.currency ?? 'BDT')}</td>
                  <td className="col-status">
                    <span className={`status-badge ${getStatusBadgeClass(payment.status)}`}>
                      {payment.status || '—'}
                    </span>
                    {getStatusTimestamp(payment) && (
                      <span className="table-status-date">
                        {formatTimestamp(getStatusTimestamp(payment), { short: true })}
                      </span>
                    )}
                  </td>
                  <td className="col-delivered">
                    {payment.status === 'Delivered' || payment.status === 'Paid' ? 'Yes' : 'No'}
                  </td>
                  <td className="col-actions">
                    <Link
                      to={`/job/${payment.id}`}
                      className="btn btn-small btn-secondary"
                      aria-label="View"
                    >
                      <Eye size={14} />
                      View
                    </Link>
                    <button
                      type="button"
                      className="btn btn-small btn-secondary"
                      onClick={() => onEdit(payment)}
                      aria-label="Edit"
                    >
                      <Pencil size={14} />
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-small btn-danger"
                      onClick={() => onDelete(payment)}
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatAmount, getStatusBadgeClass, formatTimestamp } from '../../utils/format';
import { JOB_STATUSES } from '../../schema/paymentSchema';
import { getJobTimestampMs, getRangeBounds } from '../../utils/dateRange';
import { DateRangeFilter } from '../DateRangeFilter';
import { Search, Pencil, Trash2, Eye } from 'lucide-react';
import './PaymentTable.css';

/** Same field as shown in Status column: pendingAt / ongoingAt / deliveredAt / paidAt. Fallback to timestamp. */
function getStatusTimestampMs(p) {
  const status = p?.status;
  let t = null;
  if (status === 'Pending') t = p.pendingAt ?? p.timestamp;
  else if (status === 'Ongoing') t = p.ongoingAt ?? p.timestamp;
  else if (status === 'Delivered') t = p.deliveredAt ?? p.timestamp;
  else if (status === 'Paid') t = p.paidAt ?? p.timestamp;
  else t = p.timestamp;
  if (!t) return 0;
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (t instanceof Date) return t.getTime();
  if (typeof t?.seconds === 'number') return t.seconds * 1000;
  return 0;
}

/** Sort by status (Pending → Ongoing → Delivered → Paid) then by status date (newest first). */
function sortByStatusAndDate(payments) {
  const statusOrder = JOB_STATUSES.reduce((acc, s, i) => {
    acc[s] = i;
    return acc;
  }, {});
  return [...payments].sort((a, b) => {
    const statusA = statusOrder[a.status] ?? 0;
    const statusB = statusOrder[b.status] ?? 0;
    if (statusA !== statusB) return statusA - statusB;
    return getStatusTimestampMs(b) - getStatusTimestampMs(a);
  });
}

export function PaymentTable({ payments, onEdit, onDelete }) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateRangeValue, setDateRangeValue] = useState({
    dateRange: 'all',
    customStartMs: null,
    customEndMs: null,
  });

  const filteredByDate = useMemo(() => {
    if (dateRangeValue.dateRange === 'all') return payments;
    const { start, end } = getRangeBounds(dateRangeValue.dateRange, dateRangeValue.customStartMs, dateRangeValue.customEndMs);
    return payments.filter((p) => {
      const ms = getJobTimestampMs(p);
      return ms != null && ms >= start && ms <= end;
    });
  }, [payments, dateRangeValue]);

  const filtered = useMemo(() => {
    let list = filteredByDate;
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
  }, [filteredByDate, search, filterStatus]);

  const rows = useMemo(() => sortByStatusAndDate(filtered), [filtered]);

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
        <div className="table-toolbar__filters">
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
          <DateRangeFilter
            value={dateRangeValue}
            onChange={setDateRangeValue}
            label={null}
            className="table-toolbar__date-filter"
          />
        </div>
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
              rows.map((payment, index) => (
                <tr key={payment.id} className={index % 2 === 1 ? 'row-alt' : ''}>
                  <td className="col-client">
                    {payment.clientName || '—'}
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
                      className="btn btn-small btn-secondary btn-icon"
                      onClick={() => onEdit(payment)}
                      aria-label="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-small btn-danger btn-icon"
                      onClick={() => onDelete(payment)}
                      aria-label="Delete"
                    >
                      <Trash2 size={14} />
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

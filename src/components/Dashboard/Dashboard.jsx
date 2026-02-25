import { Link } from 'react-router-dom';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { subscribePayments } from '../../firebase/payments';
import { subscribePaymentRecords } from '../../firebase/paymentRecords';
import { subscribeClients } from '../../firebase/clients';
import { formatAmount } from '../../utils/format';
import { Users, Briefcase, Banknote, Calendar, ChevronDown, Check } from 'lucide-react';
import './Dashboard.css';

function getJobTimestampMs(p) {
  const t = p?.timestamp;
  if (!t) return null;
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (t instanceof Date) return t.getTime();
  if (typeof t?.seconds === 'number') return t.seconds * 1000;
  return null;
}

const DATE_RANGES = [
  { value: 'all', label: 'All time' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'thisMonth', label: 'This month' },
];

function getRangeBounds(value) {
  const now = Date.now();
  if (value === 'all') return { start: 0, end: now };
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const end = endOfToday.getTime();
  let start;
  if (value === '7d') start = now - 7 * 24 * 60 * 60 * 1000;
  else if (value === '30d') start = now - 30 * 24 * 60 * 60 * 1000;
  else if (value === '90d') start = now - 90 * 24 * 60 * 60 * 1000;
  else if (value === 'thisMonth') {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    start = d.getTime();
  } else start = 0;
  return { start, end };
}

export function Dashboard() {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]);
  const [records, setRecords] = useState([]);
  const [clientsLoaded, setClientsLoaded] = useState(false);
  const [paymentsLoaded, setPaymentsLoaded] = useState(false);
  const [dateRange, setDateRange] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef(null);

  useEffect(() => {
    if (!filterOpen) return;
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [filterOpen]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubC = subscribeClients((list) => {
      setClients(list);
      setClientsLoaded(true);
    });
    const unsubP = subscribePayments((list) => {
      setPayments(list);
      setPaymentsLoaded(true);
    });
    const unsubR = subscribePaymentRecords(setRecords);
    return () => {
      unsubC();
      unsubP();
      unsubR();
    };
  }, [user?.uid]);

  const dataLoaded = clientsLoaded && paymentsLoaded;

  const totalPaidByJob = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      map[r.jobId] = (map[r.jobId] || 0) + (Number(r.amount) || 0);
    });
    return map;
  }, [records]);

  const filteredPayments = useMemo(() => {
    if (dateRange === 'all') return payments;
    const { start, end } = getRangeBounds(dateRange);
    return payments.filter((p) => {
      const ms = getJobTimestampMs(p);
      return ms != null && ms >= start && ms <= end;
    });
  }, [payments, dateRange]);

  const stats = useMemo(() => {
    const byCurrency = {};
    let deliveredCount = 0;
    let paidCount = 0;
    let outstandingCount = 0;

    filteredPayments.forEach((p) => {
      const curr = p.currency && ['BDT', 'USD', 'EUR'].includes(p.currency) ? p.currency : 'BDT';
      if (!byCurrency[curr]) {
        byCurrency[curr] = {
          totalAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          ongoingAmount: 0,
          outstandingAmount: 0,
          paidCount: 0,
          pendingCount: 0,
          ongoingCount: 0,
          outstandingCount: 0,
        };
      }
      const amt = Number(p.amount) || 0;
      const paid = totalPaidByJob[p.id] || 0;
      byCurrency[curr].totalAmount += amt;
      if (p.status === 'Paid') {
        byCurrency[curr].paidAmount += amt;
        byCurrency[curr].paidCount += 1;
        paidCount += 1;
      } else if (p.status === 'Pending') {
        byCurrency[curr].pendingAmount += amt;
        byCurrency[curr].pendingCount += 1;
      } else if (p.status === 'Ongoing') {
        byCurrency[curr].ongoingAmount += amt;
        byCurrency[curr].ongoingCount += 1;
      } else if (p.status === 'Delivered') {
        const remaining = Math.max(0, amt - paid);
        byCurrency[curr].outstandingAmount += remaining;
        if (remaining > 0) byCurrency[curr].outstandingCount += 1;
        outstandingCount += remaining > 0 ? 1 : 0;
      }
      if (p.isDelivered) deliveredCount += 1;
    });

    const currencies = Object.keys(byCurrency).sort();
    return {
      byCurrency,
      currencies,
      totalJobs: filteredPayments.length,
      deliveredCount,
      paidCount,
      outstandingCount,
    };
  }, [filteredPayments, totalPaidByJob]);

  return (
    <div className="page dashboard-page">
      <div className="dashboard-hero">
        <h1 className="dashboard-hero__title">Welcome to ClientKhata</h1>
        <p className="dashboard-hero__subtitle">
          Manage your clients and track jobs in one place.
        </p>
      </div>

      {!dataLoaded ? (
        <div className="page-loading">
          <span className="page-loading__spinner" aria-hidden="true" />
          <span className="page-loading__text">Loading…</span>
        </div>
      ) : (
        <>
      <section className="dashboard-stats" aria-label="Overview statistics">
        <div className="dashboard-stats__filter" ref={filterRef}>
          <span className="dashboard-stats__filter-label">Period</span>
          <div className="dashboard-stats__filter-select">
            <button
              type="button"
              className="dashboard-stats__filter-trigger"
              onClick={() => setFilterOpen((o) => !o)}
              aria-expanded={filterOpen}
              aria-haspopup="listbox"
              aria-label="Select date range"
            >
              <span className="dashboard-stats__filter-trigger-text">
                {DATE_RANGES.find((r) => r.value === dateRange)?.label ?? 'All time'}
              </span>
              <ChevronDown size={16} className={`dashboard-stats__filter-chevron ${filterOpen ? 'dashboard-stats__filter-chevron--open' : ''}`} aria-hidden />
            </button>
            {filterOpen && (
              <div className="dashboard-stats__filter-dropdown" role="listbox" aria-label="Date range options">
                {DATE_RANGES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    role="option"
                    aria-selected={dateRange === value}
                    className={`dashboard-stats__filter-option ${dateRange === value ? 'dashboard-stats__filter-option--active' : ''}`}
                    onClick={() => {
                      setDateRange(value);
                      setFilterOpen(false);
                    }}
                  >
                    <span>{label}</span>
                    {dateRange === value && <Check size={14} className="dashboard-stats__filter-check" aria-hidden />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <h2 className="dashboard-stats__heading">Money</h2>
        <div className="dashboard-stats__grid">
          {stats.currencies.length === 0 ? (
            <div className="dashboard-stat dashboard-stat--total">
              <span className="dashboard-stat__label">Total</span>
              <span className="dashboard-stat__value">{formatAmount(0)}</span>
            </div>
          ) : (
            stats.currencies.map((curr) => {
              const s = stats.byCurrency[curr];
              return (
                <div key={curr} className="dashboard-stat-group">
                  <div className="dashboard-stat-group__label">{curr}</div>
                  <div className="dashboard-stats__grid dashboard-stats__grid--nested">
                    <div className="dashboard-stat dashboard-stat--total">
                      <span className="dashboard-stat__label">Total</span>
                      <span className="dashboard-stat__value">{formatAmount(s.totalAmount, curr)}</span>
                    </div>
                    <div className="dashboard-stat dashboard-stat--paid">
                      <span className="dashboard-stat__label">Paid</span>
                      <span className="dashboard-stat__value">{formatAmount(s.paidAmount, curr)}</span>
                      <span className="dashboard-stat__meta">{s.paidCount} job{s.paidCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="dashboard-stat dashboard-stat--pending">
                      <span className="dashboard-stat__label">Pending</span>
                      <span className="dashboard-stat__value">{formatAmount(s.pendingAmount, curr)}</span>
                      <span className="dashboard-stat__meta">{s.pendingCount} job{s.pendingCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="dashboard-stat dashboard-stat--ongoing">
                      <span className="dashboard-stat__label">Ongoing</span>
                      <span className="dashboard-stat__value">{formatAmount(s.ongoingAmount, curr)}</span>
                      <span className="dashboard-stat__meta">{s.ongoingCount} job{s.ongoingCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="dashboard-stat dashboard-stat--outstanding">
                      <span className="dashboard-stat__label">Outstanding</span>
                      <span className="dashboard-stat__value">{formatAmount(s.outstandingAmount, curr)}</span>
                      <span className="dashboard-stat__meta">{s.outstandingCount} to collect</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <h2 className="dashboard-stats__heading">Jobs</h2>
        <div className="dashboard-stats__grid dashboard-stats__grid--jobs">
          <div className="dashboard-stat">
            <span className="dashboard-stat__label">Total jobs</span>
            <span className="dashboard-stat__value dashboard-stat__value--number">{stats.totalJobs}</span>
          </div>
          <div className="dashboard-stat">
            <span className="dashboard-stat__label">Delivered</span>
            <span className="dashboard-stat__value dashboard-stat__value--number">{stats.deliveredCount}</span>
          </div>
          <div className="dashboard-stat">
            <span className="dashboard-stat__label">Paid</span>
            <span className="dashboard-stat__value dashboard-stat__value--number">{stats.paidCount}</span>
          </div>
          <div className="dashboard-stat">
            <span className="dashboard-stat__label">Outstanding</span>
            <span className="dashboard-stat__value dashboard-stat__value--number">{stats.outstandingCount}</span>
          </div>
        </div>
      </section>

      <div className="dashboard-cards">
        <Link to="/clients" className="dashboard-card">
          <span className="dashboard-card__icon" aria-hidden="true">
            <Users size={24} />
          </span>
          <h2 className="dashboard-card__title">Clients</h2>
          <p className="dashboard-card__desc">Add and manage client details.</p>
          <span className="dashboard-card__count">{clients.length} client{clients.length !== 1 ? 's' : ''}</span>
        </Link>
        <Link to="/jobs" className="dashboard-card">
          <span className="dashboard-card__icon" aria-hidden="true">
            <Briefcase size={24} />
          </span>
          <h2 className="dashboard-card__title">Jobs</h2>
          <p className="dashboard-card__desc">Board and table view. Track status: Pending → Paid.</p>
          <span className="dashboard-card__count">{stats.totalJobs} job{stats.totalJobs !== 1 ? 's' : ''}</span>
        </Link>
        <Link to="/payments" className="dashboard-card">
          <span className="dashboard-card__icon" aria-hidden="true">
            <Banknote size={24} />
          </span>
          <h2 className="dashboard-card__title">Payments</h2>
          <p className="dashboard-card__desc">Record partial or full payments for delivered jobs.</p>
          <span className="dashboard-card__count">
            {stats.outstandingCount > 0 ? `${stats.outstandingCount} to collect` : 'Record payment'}
          </span>
        </Link>
      </div>
        </>
      )}
    </div>
  );
}

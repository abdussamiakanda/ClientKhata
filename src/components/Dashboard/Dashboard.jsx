import { Link } from 'react-router-dom';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { subscribePayments } from '../../firebase/payments';
import { subscribePaymentRecords } from '../../firebase/paymentRecords';
import { subscribeClients } from '../../firebase/clients';
import { formatAmount } from '../../utils/format';
import { getJobTimestampMs, getRangeBounds, getCalendarDays, formatRangeLabel } from '../../utils/dateRange';
import { Users, Briefcase, Banknote, ChevronDown } from 'lucide-react';
import './Dashboard.css';

export function Dashboard() {
  const { user } = useAuth();
  const [clients, setClients] = useState([]);
  const [payments, setPayments] = useState([]);
  const [records, setRecords] = useState([]);
  const [clientsLoaded, setClientsLoaded] = useState(false);
  const [paymentsLoaded, setPaymentsLoaded] = useState(false);
  const [dateRange, setDateRange] = useState('all');
  const [customStartMs, setCustomStartMs] = useState(null);
  const [customEndMs, setCustomEndMs] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [pendingStartMs, setPendingStartMs] = useState(null); // first click = start; second click = end then close
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
    if (!filterOpen) setPendingStartMs(null);
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
    const { start, end } = getRangeBounds(dateRange, customStartMs, customEndMs);
    return payments.filter((p) => {
      const ms = getJobTimestampMs(p);
      return ms != null && ms >= start && ms <= end;
    });
  }, [payments, dateRange, customStartMs, customEndMs]);

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
                {dateRange === 'custom' && customStartMs != null && customEndMs != null
                  ? formatRangeLabel(customStartMs, customEndMs)
                  : 'All time'}
              </span>
              <ChevronDown size={16} className={`dashboard-stats__filter-chevron ${filterOpen ? 'dashboard-stats__filter-chevron--open' : ''}`} aria-hidden />
            </button>
            {filterOpen && (
              <div className="dashboard-stats__filter-dropdown" role="dialog" aria-label="Date range">
                <div className="dashboard-stats__filter-calendar-wrap">
                  <p className="dashboard-stats__filter-calendar-hint">
                    {pendingStartMs == null ? 'Click start date, then end date' : 'Click end date'}
                  </p>
                  <div className="dashboard-stats__filter-calendar">
                    <div className="dashboard-stats__calendar-nav">
                      <button
                        type="button"
                        className="dashboard-stats__calendar-nav-btn"
                        onClick={() => setCalendarMonth((m) => (m.month === 0 ? { year: m.year - 1, month: 11 } : { year: m.year, month: m.month - 1 }))}
                        aria-label="Previous month"
                      >
                        ‹
                      </button>
                      <span className="dashboard-stats__calendar-title">
                        {new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </span>
                      <button
                        type="button"
                        className="dashboard-stats__calendar-nav-btn"
                        onClick={() => setCalendarMonth((m) => (m.month === 11 ? { year: m.year + 1, month: 0 } : { year: m.year, month: m.month + 1 }))}
                        aria-label="Next month"
                      >
                        ›
                      </button>
                    </div>
                    <div className="dashboard-stats__calendar-weekdays">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                        <span key={d} className="dashboard-stats__calendar-weekday">{d}</span>
                      ))}
                    </div>
                    <div className="dashboard-stats__calendar-grid">
                      {getCalendarDays(calendarMonth.year, calendarMonth.month).map((date, i) => {
                        if (!date) return <div key={`empty-${i}`} className="dashboard-stats__calendar-day dashboard-stats__calendar-day--empty" />;
                        const dayMs = date.getTime();
                        const range = dateRange === 'custom' && customStartMs != null && customEndMs != null
                          ? { startMs: customStartMs, endMs: customEndMs }
                          : pendingStartMs != null
                            ? { startMs: pendingStartMs, endMs: pendingStartMs }
                            : null;
                        const inRange = range && dayMs >= range.startMs && dayMs <= range.endMs;
                        const isStart = range && dayMs === range.startMs;
                        const isEnd = range && dayMs === range.endMs;
                        return (
                          <button
                            key={dayMs}
                            type="button"
                            className={`dashboard-stats__calendar-day ${inRange ? 'dashboard-stats__calendar-day--in-range' : ''} ${isStart ? 'dashboard-stats__calendar-day--start' : ''} ${isEnd ? 'dashboard-stats__calendar-day--end' : ''}`}
                            onClick={() => {
                              if (pendingStartMs == null) {
                                if (dateRange === 'custom' && (customStartMs != null || customEndMs != null)) {
                                  setDateRange('all');
                                  setCustomStartMs(null);
                                  setCustomEndMs(null);
                                }
                                setPendingStartMs(dayMs);
                              } else {
                                const startMs = Math.min(pendingStartMs, dayMs);
                                const endMs = Math.max(pendingStartMs, dayMs);
                                setCustomStartMs(startMs);
                                setCustomEndMs(endMs);
                                setDateRange('custom');
                                setPendingStartMs(null);
                                setFilterOpen(false);
                              }
                            }}
                          >
                            {date.getDate()}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="dashboard-stats__filter-all-time"
                  onClick={() => {
                    setDateRange('all');
                    setFilterOpen(false);
                    setPendingStartMs(null);
                  }}
                >
                  All time
                </button>
              </div>
            )}
          </div>
        </div>
        <h2 className="dashboard-stats__heading">Money</h2>
        <div className="dashboard-stats__grid dashboard-stats__grid--money">
          <div className="dashboard-stat dashboard-stat--total">
            <span className="dashboard-stat__label">Total</span>
            {stats.currencies.length === 0 ? (
              <span className="dashboard-stat__value">{formatAmount(0)}</span>
            ) : (
              <div className="dashboard-stat__currencies">
                {stats.currencies.map((curr) => (
                  <span key={curr} className="dashboard-stat__currency-row">
                    {curr} {formatAmount(stats.byCurrency[curr].totalAmount, curr)}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="dashboard-stat dashboard-stat--paid">
            <span className="dashboard-stat__label">Paid</span>
            {stats.currencies.length === 0 ? (
              <span className="dashboard-stat__value">{formatAmount(0)}</span>
            ) : (
              <>
                <div className="dashboard-stat__currencies">
                  {stats.currencies.map((curr) => (
                    <span key={curr} className="dashboard-stat__currency-row">
                      {curr} {formatAmount(stats.byCurrency[curr].paidAmount, curr)}
                    </span>
                  ))}
                </div>
                <span className="dashboard-stat__meta">{stats.paidCount} job{stats.paidCount !== 1 ? 's' : ''}</span>
              </>
            )}
          </div>
          <div className="dashboard-stat dashboard-stat--pending">
            <span className="dashboard-stat__label">Pending</span>
            {stats.currencies.length === 0 ? (
              <span className="dashboard-stat__value">{formatAmount(0)}</span>
            ) : (
              <>
                <div className="dashboard-stat__currencies">
                  {stats.currencies.map((curr) => (
                    <span key={curr} className="dashboard-stat__currency-row">
                      {curr} {formatAmount(stats.byCurrency[curr].pendingAmount, curr)}
                    </span>
                  ))}
                </div>
                <span className="dashboard-stat__meta">
                  {stats.currencies.reduce((n, c) => n + (stats.byCurrency[c].pendingCount || 0), 0)} job{stats.currencies.reduce((n, c) => n + (stats.byCurrency[c].pendingCount || 0), 0) !== 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
          <div className="dashboard-stat dashboard-stat--ongoing">
            <span className="dashboard-stat__label">Ongoing</span>
            {stats.currencies.length === 0 ? (
              <span className="dashboard-stat__value">{formatAmount(0)}</span>
            ) : (
              <>
                <div className="dashboard-stat__currencies">
                  {stats.currencies.map((curr) => (
                    <span key={curr} className="dashboard-stat__currency-row">
                      {curr} {formatAmount(stats.byCurrency[curr].ongoingAmount, curr)}
                    </span>
                  ))}
                </div>
                <span className="dashboard-stat__meta">
                  {stats.currencies.reduce((n, c) => n + (stats.byCurrency[c].ongoingCount || 0), 0)} job{stats.currencies.reduce((n, c) => n + (stats.byCurrency[c].ongoingCount || 0), 0) !== 1 ? 's' : ''}
                </span>
              </>
            )}
          </div>
          <div className="dashboard-stat dashboard-stat--outstanding">
            <span className="dashboard-stat__label">Outstanding</span>
            {stats.currencies.length === 0 ? (
              <span className="dashboard-stat__value">{formatAmount(0)}</span>
            ) : (
              <>
                <div className="dashboard-stat__currencies">
                  {stats.currencies.map((curr) => (
                    <span key={curr} className="dashboard-stat__currency-row">
                      {curr} {formatAmount(stats.byCurrency[curr].outstandingAmount, curr)}
                    </span>
                  ))}
                </div>
                <span className="dashboard-stat__meta">{stats.outstandingCount} to collect</span>
              </>
            )}
          </div>
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

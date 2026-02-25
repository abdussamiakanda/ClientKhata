import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { formatAmount } from '../../utils/format';
import { JOB_STATUSES } from '../../schema/paymentSchema';
import { Pencil, Trash2, PackageCheck, Clock, PlayCircle, CheckCircle, Eye, Inbox } from 'lucide-react';
import './PaymentBoard.css';

const DRAG_TYPE = 'application/x-board-job';

const EMPTY_ICONS = {
  Pending: Clock,
  Ongoing: PlayCircle,
  Delivered: PackageCheck,
  Paid: CheckCircle,
};

const ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function getPaidAtMs(job) {
  const t = job.paidAt;
  if (!t) return null;
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (t instanceof Date) return t.getTime();
  if (typeof t?.seconds === 'number') return t.seconds * 1000;
  return null;
}

export function PaymentBoard({ payments, totalPaidByJob = {}, onStatusChange, onEdit, onDelete }) {
  const byStatus = useMemo(() => {
    const map = {};
    JOB_STATUSES.forEach((s) => { map[s] = []; });
    const oneMonthAgo = Date.now() - ONE_MONTH_MS;
    payments.forEach((p) => {
      const s = p.status && map[p.status] ? p.status : 'Pending';
      if (!map[s]) map[s] = [];
      if (s === 'Paid') {
        const paidMs = getPaidAtMs(p);
        if (paidMs != null && paidMs < oneMonthAgo) return;
      }
      map[s].push(p);
    });
    return map;
  }, [payments]);

  function handleDragStart(e, job) {
    e.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ id: job.id, status: job.status }));
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('board-card--dragging');
  }

  function handleDragEnd(e) {
    e.currentTarget.classList.remove('board-card--dragging');
  }

  function handleDragOver(e, columnStatus) {
    if (columnStatus === 'Paid') return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('board-column--drag-over');
  }

  function handleDragLeave(e) {
    e.currentTarget.classList.remove('board-column--drag-over');
  }

  function handleDrop(e, newStatus) {
    e.currentTarget.classList.remove('board-column--drag-over');
    if (newStatus === 'Paid') return;
    e.preventDefault();
    try {
      const raw = e.dataTransfer.getData(DRAG_TYPE);
      if (!raw) return;
      const { id, status } = JSON.parse(raw);
      if (id && newStatus && newStatus !== status) {
        onStatusChange(id, newStatus);
      }
    } catch (_) {
      // ignore
    }
  }

  return (
    <div className="board-view">
      <div className="board-columns">
        {JOB_STATUSES.map((status) => (
          <div
            key={status}
            className="board-column"
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status)}
          >
            <div className={`board-column-header board-column-header--${status.replace(/\s+/g, '-')}`}>
              <span className="board-column-title">{status}</span>
              <span className="board-column-count">{(byStatus[status] || []).length}</span>
            </div>
            <div className="board-column-cards">
              {(byStatus[status] || []).length === 0 ? (
                <div className="board-column-empty" aria-label={`No jobs in ${status}`}>
                  {(() => {
                    const Icon = EMPTY_ICONS[status] || Inbox;
                    return <Icon size={40} className="board-column-empty__icon" aria-hidden />;
                  })()}
                  <span className="board-column-empty__text">No jobs</span>
                  {status !== 'Paid' && (
                    <span className="board-column-empty__hint">Drop here</span>
                  )}
                </div>
              ) : (
              (byStatus[status] || []).map((job) => {
                const totalPaid = totalPaidByJob[job.id] || 0;
                const currency = job.currency ?? 'BDT';
                return (
                    <div
                      key={job.id}
                      className="board-card"
                      draggable={job.status !== 'Paid'}
                      onDragStart={(e) => handleDragStart(e, job)}
                      onDragEnd={handleDragEnd}
                    >
                    <div className="board-card-actions">
                      <Link
                        to={`/job/${job.id}`}
                        className="board-card-action btn btn-icon"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="View"
                      >
                        <Eye size={16} />
                      </Link>
                      <button
                        type="button"
                        className="board-card-action btn btn-icon"
                        onClick={(e) => { e.stopPropagation(); onEdit(job); }}
                        aria-label="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="board-card-action board-card-action--danger btn btn-icon"
                        onClick={(e) => { e.stopPropagation(); onDelete(job); }}
                        aria-label="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="board-card-client">{job.clientName || '—'}</div>
                    <div className="board-card-job">{job.workDescription || '—'}</div>
                    <div className="board-card-amount">
                      {job.status === 'Paid' ? (
                        <>
                          <CheckCircle size={14} />
                          Paid in full
                        </>
                      ) : totalPaid > 0 ? (
                        <>
                          {job.status === 'Delivered' ? <PackageCheck size={14} /> : job.status === 'Ongoing' ? <PlayCircle size={14} /> : <Clock size={14} />}
                          Paid {formatAmount(totalPaid, currency)} of {formatAmount(job.amount, currency)}
                        </>
                      ) : job.status === 'Ongoing' ? (
                        <>
                          <PlayCircle size={14} />
                          {formatAmount(job.amount, currency)}
                        </>
                      ) : (
                        <>
                          <Clock size={14} />
                          {formatAmount(job.amount, currency)}
                        </>
                      )}
                    </div>
                  </div>
                );
              })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

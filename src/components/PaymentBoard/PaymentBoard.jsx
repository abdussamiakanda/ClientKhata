import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { formatAmount } from '../../utils/format';
import { JOB_STATUSES } from '../../schema/paymentSchema';
import { useSettings } from '../../context/SettingsContext';
import { Pencil, Trash2, PackageCheck, Clock, PlayCircle, CheckCircle, Eye, Inbox, FileText } from 'lucide-react';
import { navFromForNext } from '../../utils/navBack';
import './PaymentBoard.css';

const DRAG_TYPE = 'application/x-board-job';

const LONG_PRESS_MS = 480;
const LONG_PRESS_MOVE_CANCEL_PX = 50;
const VIEWPORT_EDGE_PX = 72;
const EDGE_SCROLL_STEP = 16;

const EMPTY_ICONS = {
  Pending: Clock,
  Ongoing: PlayCircle,
  Delivered: PackageCheck,
  Paid: CheckCircle,
};

function getPaidAtMs(job) {
  const t = job.paidAt;
  if (!t) return null;
  if (typeof t.toMillis === 'function') return t.toMillis();
  if (t instanceof Date) return t.getTime();
  if (typeof t?.seconds === 'number') return t.seconds * 1000;
  return null;
}

/** Same date as shown in table Status column: status-specific date or timestamp. */
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

function getMainScrollEl() {
  return document.querySelector('main.app-main');
}

function resolveColumnStatusFromPoint(clientX, clientY) {
  const el = document.elementFromPoint(clientX, clientY);
  let n = el;
  while (n) {
    const s = n.dataset?.boardStatus;
    if (s && JOB_STATUSES.includes(s)) return s;
    n = n.parentElement;
  }
  return null;
}

function applyMainVerticalEdgeScroll(clientY) {
  const main = getMainScrollEl();
  if (!main) return;
  const h = window.visualViewport?.height ?? window.innerHeight;
  const topEdge = VIEWPORT_EDGE_PX;
  const bottomEdge = h - VIEWPORT_EDGE_PX;
  const max = main.scrollHeight - main.clientHeight;
  if (clientY < topEdge) {
    main.scrollTop = Math.max(0, main.scrollTop - EDGE_SCROLL_STEP);
  } else if (clientY > bottomEdge) {
    main.scrollTop = Math.min(max, main.scrollTop + EDGE_SCROLL_STEP);
  }
}

export function PaymentBoard({ payments, totalPaidByJob = {}, onStatusChange, onEdit, onDelete }) {
  const location = useLocation();
  const { settings } = useSettings();
  const cutoffMs = settings.paidColumnCutoffDays > 0
    ? settings.paidColumnCutoffDays * 24 * 60 * 60 * 1000
    : 0;

  const isTouchDevice = useMemo(() => {
    return typeof window !== 'undefined' && 
      ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const [touchArmedJobId, setTouchArmedJobId] = useState(null);
  const [touchOverColumnStatus, setTouchOverColumnStatus] = useState(null);

  const longPressTimerRef = useRef(null);
  const longPressJobRef = useRef(null);
  const touchStartRef = useRef({ x: 0, y: 0 });
  const armedFromStatusRef = useRef('');
  const armedJobIdRef = useRef(null);
  const touchOverColumnRef = useRef(null);
  const docMoveRef = useRef(null);
  const docEndRef = useRef(null);
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current != null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressJobRef.current = null;
  }, []);

  const detachDocumentTouch = useCallback(() => {
    if (docMoveRef.current) {
      document.removeEventListener('touchmove', docMoveRef.current, { capture: true });
      docMoveRef.current = null;
    }
    if (docEndRef.current) {
      document.removeEventListener('touchend', docEndRef.current, { capture: true });
      document.removeEventListener('touchcancel', docEndRef.current, { capture: true });
      docEndRef.current = null;
    }
  }, []);

  const finishTouchDrag = useCallback((clientX, clientY) => {
    detachDocumentTouch();
    const armedId = armedJobIdRef.current;
    const fromStatus = armedFromStatusRef.current;
    armedJobIdRef.current = null;
    setTouchArmedJobId(null);
    setTouchOverColumnStatus(null);
    touchOverColumnRef.current = null;
    if (!armedId) return;
    const newStatus = resolveColumnStatusFromPoint(clientX, clientY);
    if (newStatus && newStatus !== 'Paid' && newStatus !== fromStatus) {
      onStatusChangeRef.current(armedId, newStatus);
    }
  }, [detachDocumentTouch]);

  useEffect(() => {
    const onGlobalTouchMove = (e) => {
      if (armedJobIdRef.current) {
        e.preventDefault(); // This now successfully prevents scrolling on iOS!
      }
    };
    // Must be attached before any touch starts so iOS doesn't ignore passive: false
    document.addEventListener('touchmove', onGlobalTouchMove, { passive: false, capture: true });
    return () => document.removeEventListener('touchmove', onGlobalTouchMove, { capture: true });
  }, []);

  useEffect(() => () => {
    clearLongPressTimer();
    detachDocumentTouch();
  }, [clearLongPressTimer, detachDocumentTouch]);



  useEffect(() => {
    const main = getMainScrollEl();
    if (!main) return;
    if (touchArmedJobId) {
      const prev = main.style.position;
      const prevZ = main.style.zIndex;
      main.style.position = 'relative';
      main.style.zIndex = '52';
      return () => {
        main.style.position = prev;
        main.style.zIndex = prevZ;
      };
    }
  }, [touchArmedJobId]);

  const armTouchDrag = useCallback((job) => {
    clearLongPressTimer();
    armedFromStatusRef.current = job.status;
    armedJobIdRef.current = job.id;
    setTouchArmedJobId(job.id);

    const onMove = (e) => {
      const clientX = e.touches ? e.touches[0]?.clientX : e.clientX;
      const clientY = e.touches ? e.touches[0]?.clientY : e.clientY;
      if (clientX == null || clientY == null) return;
      
      const h = window.visualViewport?.height ?? window.innerHeight;
      const inVerticalEdge = clientY < VIEWPORT_EDGE_PX || clientY > h - VIEWPORT_EDGE_PX;
      if (inVerticalEdge) {
        applyMainVerticalEdgeScroll(clientY);
      }
      // e.preventDefault() is now handled by the permanent global listener

      const col = resolveColumnStatusFromPoint(clientX, clientY);
      if (col !== touchOverColumnRef.current) {
        touchOverColumnRef.current = col;
        setTouchOverColumnStatus(col);
      }
    };

    const onEnd = (e) => {
      const t = e.changedTouches[0];
      const cx = t?.clientX ?? 0;
      const cy = t?.clientY ?? 0;
      finishTouchDrag(cx, cy);
    };

    docMoveRef.current = onMove;
    docEndRef.current = onEnd;
    document.addEventListener('touchmove', onMove, { passive: false, capture: true });
    document.addEventListener('touchend', onEnd, { capture: true });
    document.addEventListener('touchcancel', onEnd, { capture: true });
  }, [clearLongPressTimer, finishTouchDrag]);

  function handleCardTouchStart(e, job) {
    if (armedJobIdRef.current) return;
    if (job.status === 'Paid') return;
    if (e.target.closest?.('.board-card-actions')) return;
    const t = e.touches[0];
    if (!t) return;
    touchStartRef.current = { x: t.clientX, y: t.clientY };
    longPressJobRef.current = job;
    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTimerRef.current = null;
      const j = longPressJobRef.current;
      longPressJobRef.current = null;
      if (!j) return;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(12);
        } catch (_) {
          /* ignore */
        }
      }
      armTouchDrag(j);
    }, LONG_PRESS_MS);
  }

  function handleCardTouchMove(e) {
    if (armedJobIdRef.current) return;
    const t = e.touches[0];
    if (!t || !longPressTimerRef.current) return;
    const dx = t.clientX - touchStartRef.current.x;
    const dy = t.clientY - touchStartRef.current.y;
    if (dx * dx + dy * dy > LONG_PRESS_MOVE_CANCEL_PX * LONG_PRESS_MOVE_CANCEL_PX) {
      clearLongPressTimer();
    }
  }

  function handleCardTouchEnd() {
    if (armedJobIdRef.current) return;
    clearLongPressTimer();
  }

  const byStatus = useMemo(() => {
    const map = {};
    JOB_STATUSES.forEach((s) => { map[s] = []; });
    const cutoffTime = cutoffMs > 0 ? Date.now() - cutoffMs : 0;
    payments.forEach((p) => {
      const s = p.status && map[p.status] ? p.status : 'Pending';
      if (!map[s]) map[s] = [];
      if (s === 'Paid' && cutoffMs > 0) {
        const paidMs = getPaidAtMs(p);
        if (paidMs != null && paidMs < cutoffTime) return;
      }
      map[s].push(p);
    });
    JOB_STATUSES.forEach((status) => {
      (map[status] || []).sort((a, b) => getStatusTimestampMs(b) - getStatusTimestampMs(a));
    });
    return map;
  }, [payments, cutoffMs]);

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
    <div className={`board-view${touchArmedJobId ? ' board-view--touch-drag-active' : ''}`}>
      <div className="board-columns">
        {JOB_STATUSES.map((status) => (
          <div
            key={status}
            className={`board-column${touchOverColumnStatus === status ? ' board-column--touch-over' : ''}`}
            data-board-status={status}
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
                      className={`board-card${touchArmedJobId === job.id ? ' board-card--touch-armed' : ''}`}
                      draggable={!isTouchDevice && job.status !== 'Paid'}
                      onDragStart={(e) => handleDragStart(e, job)}
                      onDragEnd={handleDragEnd}
                      onTouchStart={isTouchDevice ? undefined : (e) => handleCardTouchStart(e, job)}
                      onTouchMove={isTouchDevice ? undefined : handleCardTouchMove}
                      onTouchEnd={isTouchDevice ? undefined : handleCardTouchEnd}
                      onTouchCancel={isTouchDevice ? undefined : handleCardTouchEnd}
                      onContextMenu={(e) => {
                        // Let mobile context menu work naturally since dragging is disabled
                      }}
                    >
                    <div 
                      className="board-card-actions"
                      onClick={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <Link
                        to={`/job/${job.id}`}
                        state={navFromForNext(location)}
                        className="board-card-action btn btn-icon"
                        aria-label="View"
                      >
                        <Eye size={16} />
                      </Link>
                      <Link
                        to={`/invoice/${job.id}`}
                        className="board-card-action btn btn-icon"
                        aria-label="Invoice"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FileText size={16} />
                      </Link>
                      <button
                        type="button"
                        className="board-card-action btn btn-icon"
                        onClick={() => onEdit(job)}
                        aria-label="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="board-card-action board-card-action--danger btn btn-icon"
                        onClick={() => onDelete(job)}
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

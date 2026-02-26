import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { getCalendarDays, formatRangeLabel } from '../../utils/dateRange';
import './DateRangeFilter.css';

export function DateRangeFilter({ value, onChange, label = 'Period', className = '' }) {
  const { dateRange, customStartMs, customEndMs } = value;
  const [filterOpen, setFilterOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [pendingStartMs, setPendingStartMs] = useState(null);
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

  const handleDayClick = (dayMs) => {
    if (pendingStartMs == null) {
      if (dateRange === 'custom' && (customStartMs != null || customEndMs != null)) {
        onChange({ dateRange: 'all', customStartMs: null, customEndMs: null });
      }
      setPendingStartMs(dayMs);
    } else {
      const startMs = Math.min(pendingStartMs, dayMs);
      const endMs = Math.max(pendingStartMs, dayMs);
      onChange({ dateRange: 'custom', customStartMs: startMs, customEndMs: endMs });
      setPendingStartMs(null);
      setFilterOpen(false);
    }
  };

  const triggerLabel = dateRange === 'custom' && customStartMs != null && customEndMs != null
    ? formatRangeLabel(customStartMs, customEndMs)
    : 'All time';

  return (
    <div className={`date-range-filter ${className}`} ref={filterRef}>
      {label && <span className="date-range-filter__label">{label}</span>}
      <div className="date-range-filter__select">
        <button
          type="button"
          className="date-range-filter__trigger"
          onClick={() => setFilterOpen((o) => !o)}
          aria-expanded={filterOpen}
          aria-haspopup="dialog"
          aria-label="Select date range"
        >
          <span className="date-range-filter__trigger-text">{triggerLabel}</span>
          <ChevronDown size={16} className={`date-range-filter__chevron ${filterOpen ? 'date-range-filter__chevron--open' : ''}`} aria-hidden />
        </button>
        {filterOpen && (
          <div className="date-range-filter__dropdown" role="dialog" aria-label="Date range">
            <div className="date-range-filter__calendar-wrap">
              <p className="date-range-filter__calendar-hint">
                {pendingStartMs == null ? 'Click start date, then end date' : 'Click end date'}
              </p>
              <div className="date-range-filter__calendar">
                <div className="date-range-filter__calendar-nav">
                  <button
                    type="button"
                    className="date-range-filter__calendar-nav-btn"
                    onClick={() => setCalendarMonth((m) => (m.month === 0 ? { year: m.year - 1, month: 11 } : { year: m.year, month: m.month - 1 }))}
                    aria-label="Previous month"
                  >
                    ‹
                  </button>
                  <span className="date-range-filter__calendar-title">
                    {new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    type="button"
                    className="date-range-filter__calendar-nav-btn"
                    onClick={() => setCalendarMonth((m) => (m.month === 11 ? { year: m.year + 1, month: 0 } : { year: m.year, month: m.month + 1 }))}
                    aria-label="Next month"
                  >
                    ›
                  </button>
                </div>
                <div className="date-range-filter__calendar-weekdays">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <span key={d} className="date-range-filter__calendar-weekday">{d}</span>
                  ))}
                </div>
                <div className="date-range-filter__calendar-grid">
                  {getCalendarDays(calendarMonth.year, calendarMonth.month).map((date, i) => {
                    if (!date) return <div key={`empty-${i}`} className="date-range-filter__calendar-day date-range-filter__calendar-day--empty" />;
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
                        className={`date-range-filter__calendar-day ${inRange ? 'date-range-filter__calendar-day--in-range' : ''} ${isStart ? 'date-range-filter__calendar-day--start' : ''} ${isEnd ? 'date-range-filter__calendar-day--end' : ''}`}
                        onClick={() => handleDayClick(dayMs)}
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
              className="date-range-filter__all-time"
              onClick={() => {
                onChange({ dateRange: 'all', customStartMs: null, customEndMs: null });
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
  );
}

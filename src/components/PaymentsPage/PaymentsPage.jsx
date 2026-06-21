import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { subscribePayments, updatePayment } from "../../firebase/payments";
import { subscribeClients } from "../../firebase/clients";
import {
  subscribePaymentRecords,
  addPaymentRecord,
  addSalaryPaymentRecord,
  deletePaymentRecord,
} from "../../firebase/paymentRecords";
import { formatAmount, formatTimestamp } from "../../utils/format";
import { getStatusBadgeClass } from "../../utils/format";
import { hasMonthlySalary, getMonthlySalaryAmount, getMonthlySalaryCurrency } from "../../utils/clientUtils";
import { ConfirmModal } from "../ConfirmModal";
import { Banknote, Plus, Trash2, X } from "lucide-react";
import { PageLoader } from "../PageLoader/PageLoader";
import { useLockBodyScroll } from "../../hooks/useLockBodyScroll";
import "./PaymentsPage.css";

export function PaymentsPage() {
  const { user, loading: authLoading } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [records, setRecords] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [viewTab, setViewTab] = useState("outstanding");

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [clients, setClients] = useState([]);
  const [addForm, setAddForm] = useState({ jobId: "", amount: "", note: "" });
  const [addError, setAddError] = useState("");
  const [removeRecord, setRemoveRecord] = useState(null);
  const [paymentType, setPaymentType] = useState("job");
  const [salaryClientId, setSalaryClientId] = useState("");
  const [salaryMonth, setSalaryMonth] = useState(new Date().getMonth() + 1);
  const [salaryYear, setSalaryYear] = useState(new Date().getFullYear());

  useLockBodyScroll(addModalOpen);

  useEffect(() => {
    if (authLoading || !user?.uid) return;
    const uid = user.uid;
    const unsubJobs = subscribePayments(uid, setJobs);
    const unsubClients = subscribeClients(uid, setClients);
    const unsubRecords = subscribePaymentRecords(uid, (list) => {
      setRecords(list);
      setLoaded(true);
    });
    return () => {
      unsubJobs();
      unsubClients();
      unsubRecords();
    };
  }, [authLoading, user?.uid]);

  const totalByJob = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      if (!map[r.jobId]) map[r.jobId] = 0;
      map[r.jobId] += Number(r.amount) || 0;
    });
    return map;
  }, [records]);

  const recordsByJob = useMemo(() => {
    const map = {};
    records.forEach((r) => {
      if (!map[r.jobId]) map[r.jobId] = [];
      map[r.jobId].push(r);
    });
    Object.keys(map).forEach((id) =>
      map[id].sort(
        (a, b) => (b.paidAt?.toMillis?.() ?? 0) - (a.paidAt?.toMillis?.() ?? 0),
      ),
    );
    return map;
  }, [records]);

  const unpaidJobs = useMemo(() => {
    return jobs.filter((j) => {
      const total = totalByJob[j.id] || 0;
      return total < Number(j.amount);
    });
  }, [jobs, totalByJob]);

  const paidJobs = useMemo(() => {
    return jobs.filter((j) => {
      const total = totalByJob[j.id] || 0;
      return total >= Number(j.amount) && Number(j.amount) > 0;
    });
  }, [jobs, totalByJob]);

  const jobsWithPayments = useMemo(() => {
    return jobs.filter((j) => (recordsByJob[j.id]?.length || 0) > 0);
  }, [jobs, recordsByJob]);

  const salaryRecords = useMemo(() => {
    return records.filter((r) => r.isSalaryPayment);
  }, [records]);

  const salaryGroups = useMemo(() => {
    const groupMap = {};
    salaryRecords.forEach((r) => {
      const key = `${r.clientId}_${r.salaryMonth}_${r.salaryYear}`;
      if (!groupMap[key]) {
        groupMap[key] = { key, clientId: r.clientId, salaryMonth: r.salaryMonth, salaryYear: r.salaryYear, records: [], totalPaid: 0 };
      }
      groupMap[key].records.push(r);
      groupMap[key].totalPaid += Number(r.amount) || 0;
    });
    return Object.values(groupMap).map((g) => {
      g.records.sort((a, b) => (b.paidAt?.toMillis?.() ?? 0) - (a.paidAt?.toMillis?.() ?? 0));
      const client = clients.find((c) => c.id === g.clientId);
      g.clientName = client?.clientName || "—";
      g.monthlySalary = getMonthlySalaryAmount(client) || 0;
      g.currency = getMonthlySalaryCurrency(client) || "BDT";
      g.remaining = Math.max(0, g.monthlySalary - g.totalPaid);
      return g;
    }).sort((a, b) => {
      if (a.salaryYear !== b.salaryYear) return b.salaryYear - a.salaryYear;
      if (a.salaryMonth !== b.salaryMonth) return b.salaryMonth - a.salaryMonth;
      return a.clientName.localeCompare(b.clientName);
    });
  }, [salaryRecords, clients]);

  function getTotalPaid(jobId) {
    return totalByJob[jobId] || 0;
  }

  function getRemaining(job) {
    return Math.max(0, Number(job.amount) - getTotalPaid(job.id));
  }

  const handleAddPayment = async (e) => {
    e.preventDefault();
    setAddError("");
    const jobId = addForm.jobId.trim();
    const amount = parseFloat(addForm.amount);
    if (!jobId) {
      setAddError("Select a job.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setAddError("Enter a valid amount.");
      return;
    }
    const job = jobs.find((j) => j.id === jobId);
    if (!job) {
      setAddError("Job not found.");
      return;
    }
    const currentTotal = getTotalPaid(jobId);
    const remaining = getRemaining(job);
    if (amount > remaining) {
      const curr = job.currency ?? "BDT";
      setAddError(
        `Remaining is ${formatAmount(remaining, curr)}. Enter up to that amount.`,
      );
      return;
    }
    setBusyId("add");
    try {
      await addPaymentRecord(
        jobId,
        amount,
        addForm.note.trim() || undefined,
        user?.uid,
        Number(job.amount),
        currentTotal,
        job.status || "Delivered",
      );
      setAddForm({ jobId: "", amount: "", note: "" });
      setAddModalOpen(false);
    } catch (err) {
      setAddError(err.message || "Failed to add payment");
    } finally {
      setBusyId(null);
    }
  };

  const handleAddSalaryPayment = async (e) => {
    e.preventDefault();
    setAddError("");
    if (!salaryClientId) {
      setAddError("Select a client.");
      return;
    }
    const client = clients.find((c) => c.id === salaryClientId);
    if (!client) {
      setAddError("Client not found.");
      return;
    }
    const monthlySalary = getMonthlySalaryAmount(client);
    if (!monthlySalary) {
      setAddError("This client has no monthly salary set.");
      return;
    }
    const amount = parseFloat(addForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setAddError("Enter a valid amount.");
      return;
    }
    const key = `${salaryClientId}_${salaryMonth}_${salaryYear}`;
    const currentTotal = salaryGroups.find((g) => g.key === key)?.totalPaid || 0;
    const remaining = Math.max(0, monthlySalary - currentTotal);
    if (amount > remaining) {
      setAddError(
        `Remaining for this month is ${formatAmount(remaining, getMonthlySalaryCurrency(client))}. Enter up to that amount.`,
      );
      return;
    }
    const monthName = new Date(salaryYear, salaryMonth - 1).toLocaleString("en-US", { month: "long" });
    setBusyId("add");
    try {
      await addSalaryPaymentRecord(
        salaryClientId,
        amount,
        salaryMonth,
        salaryYear,
        addForm.note.trim() || `Salary for ${monthName} ${salaryYear}`,
        user?.uid,
      );
      setAddForm({ jobId: "", amount: "", note: "" });
      setSalaryClientId("");
      setAddModalOpen(false);
    } catch (err) {
      setAddError(err.message || "Failed to add payment");
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteRecord = async (record, job) => {
    if (!record) return;
    setBusyId(record.id);
    try {
      await deletePaymentRecord(record.id);
      if (!record.isSalaryPayment && job) {
        const newTotal = getTotalPaid(job.id) - Number(record.amount);
        const noLongerPaidInFull = newTotal < Number(job.amount);
        if (noLongerPaidInFull && job.status === "Paid") {
          await updatePayment(job.id, { status: "Delivered" });
        }
      }
      setRemoveRecord(null);
    } catch (err) {
      alert(err.message || "Failed to remove payment");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page payments-page">
      <div className="page-header">
        <h1 className="page-title">Payments</h1>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            setPaymentType("job");
            setAddForm({
              jobId: unpaidJobs[0]?.id || "",
              amount: "",
              note: "",
            });
            setSalaryClientId("");
            setSalaryMonth(new Date().getMonth() + 1);
            setSalaryYear(new Date().getFullYear());
            setAddError("");
            setAddModalOpen(true);
          }}
        >
          <Plus size={18} />
          Add <span className="hide-on-mobile">payment</span>
        </button>
      </div>

      <div className="page-content">
        {!loaded ? (
          <PageLoader />
        ) : (
          <>
            <div className="payments-view-toggle-wrap">
              <div className="view-toggle">
                <button
                  type="button"
                  className={`view-toggle-btn ${viewTab === "outstanding" ? "view-toggle-btn--active" : ""}`}
                  onClick={() => setViewTab("outstanding")}
                >
                  Outstanding
                </button>
                <button
                  type="button"
                  className={`view-toggle-btn ${viewTab === "paid" ? "view-toggle-btn--active" : ""}`}
                  onClick={() => setViewTab("paid")}
                >
                  Paid
                </button>
                <button
                  type="button"
                  className={`view-toggle-btn ${viewTab === "salary" ? "view-toggle-btn--active" : ""}`}
                  onClick={() => setViewTab("salary")}
                >
                  Salary
                </button>
              </div>
            </div>

            <div className="payments-content">
              {viewTab === "outstanding" && (
                unpaidJobs.length > 0 ? (
                  <ul className="payments-job-list">
                    {unpaidJobs.map((job) => {
                      const totalPaid = getTotalPaid(job.id);
                      const remaining = getRemaining(job);
                      const jobRecords = recordsByJob[job.id] || [];
                      return (
                        <li key={job.id} className="payments-job-card">
                          <div className="payments-job-card__head">
                            <div className="payments-job-card__info">
                              <span className="payments-job-card__client">
                                {job.clientName || "—"}
                              </span>
                              <span className="payments-job-card__desc">
                                {job.workDescription || "—"}
                              </span>
                              <span className="payments-job-card__meta">
                                Total{" "}
                                {formatAmount(job.amount, job.currency ?? "BDT")}{" "}
                                · Paid{" "}
                                {formatAmount(totalPaid, job.currency ?? "BDT")} ·
                                Remaining{" "}
                                {formatAmount(remaining, job.currency ?? "BDT")}
                              </span>
                            </div>
                            <button
                              type="button"
                              className="btn btn-primary btn-small"
                              onClick={() => {
                                setAddForm({
                                  jobId: job.id,
                                  amount: String(remaining),
                                  note: "",
                                });
                                setAddError("");
                                setAddModalOpen(true);
                              }}
                              disabled={busyId === "add"}
                            >
                              <Plus size={14} />
                              Add payment
                            </button>
                          </div>
                          {jobRecords.length > 0 && (
                            <ul className="payments-record-list">
                              {jobRecords.map((r) => (
                                <li key={r.id} className="payments-record-item">
                                  <span className="payments-record-amount">
                                    {formatAmount(r.amount, job.currency ?? "BDT")}
                                  </span>
                                  <span className="payments-record-date">
                                    {formatTimestamp(r.paidAt, { short: true })}
                                  </span>
                                  {r.note && (
                                    <span className="payments-record-note">{r.note}</span>
                                  )}
                                  <button
                                    type="button"
                                    className="btn btn-icon btn-small btn-danger"
                                    onClick={() => setRemoveRecord({ record: r, job })}
                                    disabled={busyId !== null}
                                    aria-label="Remove payment"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="payments-empty">
                    <Banknote size={48} className="payments-empty__icon" aria-hidden="true" />
                    <p>All jobs are paid in full.</p>
                  </div>
                )
              )}

              {viewTab === "paid" && (
                paidJobs.length > 0 ? (
                  <ul className="payments-job-list">
                    {paidJobs.map((job) => {
                      const totalPaid = getTotalPaid(job.id);
                      const jobRecords = recordsByJob[job.id] || [];
                      return (
                        <li key={job.id} className="payments-job-card payments-job-card--paid">
                          <div className="payments-job-card__head">
                            <div className="payments-job-card__info">
                              <span className="payments-job-card__client">
                                {job.clientName || "—"}
                              </span>
                              <span className="payments-job-card__desc">
                                {job.workDescription || "—"}
                              </span>
                              <span className="payments-job-card__meta">
                                Total{" "}
                                {formatAmount(job.amount, job.currency ?? "BDT")}{" "}
                                · Paid{" "}
                                {formatAmount(totalPaid, job.currency ?? "BDT")}
                              </span>
                              <span className={`status-badge status-badge--small ${getStatusBadgeClass(job.status)}`}>
                                {job.status}
                              </span>
                            </div>
                          </div>
                          <ul className="payments-record-list">
                            {jobRecords.map((r) => (
                              <li key={r.id} className="payments-record-item">
                                <span className="payments-record-amount">
                                  {formatAmount(r.amount)}
                                </span>
                                <span className="payments-record-date">
                                  {formatTimestamp(r.paidAt, { short: true })}
                                </span>
                                {r.note && (
                                  <span className="payments-record-note">{r.note}</span>
                                )}
                                <button
                                  type="button"
                                  className="btn btn-icon btn-small btn-danger"
                                  onClick={() => setRemoveRecord({ record: r, job })}
                                  disabled={busyId !== null}
                                  aria-label="Remove payment"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="payments-empty">
                    <Banknote size={48} className="payments-empty__icon" aria-hidden="true" />
                    <p>No jobs paid in full yet.</p>
                  </div>
                )
              )}

              {viewTab === "salary" && (
                salaryGroups.length > 0 ? (
                  <ul className="payments-job-list">
                    {salaryGroups.map((group) => {
                      const monthName = group.salaryMonth
                        ? new Date(group.salaryYear || 2024, group.salaryMonth - 1).toLocaleString("en-US", { month: "long" })
                        : "";
                      const isFullyPaid = group.remaining <= 0;
                      return (
                        <li key={group.key} className={`payments-job-card ${isFullyPaid ? "payments-job-card--paid" : ""}`}>
                          <div className="payments-job-card__head">
                            <div className="payments-job-card__info">
                              <span className="payments-job-card__client">
                                {group.clientName}
                              </span>
                              <span className="payments-job-card__desc">
                                Salary – {monthName} {group.salaryYear || ""}
                              </span>
                              <span className="payments-job-card__meta">
                                {formatAmount(group.monthlySalary, group.currency)}{" "}
                                · Paid {formatAmount(group.totalPaid, group.currency)}
                                {!isFullyPaid && ` · Remaining ${formatAmount(group.remaining, group.currency)}`}
                              </span>
                            </div>
                            {!isFullyPaid && (
                              <button
                                type="button"
                                className="btn btn-primary btn-small"
                                onClick={() => {
                                  setPaymentType("salary");
                                  setSalaryClientId(group.clientId);
                                  setSalaryMonth(group.salaryMonth);
                                  setSalaryYear(group.salaryYear);
                                  setAddForm((p) => ({
                                    ...p,
                                    amount: String(group.remaining),
                                  }));
                                  setAddError("");
                                  setAddModalOpen(true);
                                }}
                                disabled={busyId === "add"}
                              >
                                <Plus size={14} />
                                Add payment
                              </button>
                            )}
                          </div>
                          <ul className="payments-record-list">
                            {group.records.map((r) => (
                              <li key={r.id} className="payments-record-item">
                                <span className="payments-record-amount">
                                  {formatAmount(r.amount, group.currency)}
                                </span>
                                <span className="payments-record-date">
                                  {formatTimestamp(r.paidAt, { short: true })}
                                </span>
                                {r.note && (
                                  <span className="payments-record-note">{r.note}</span>
                                )}
                                <button
                                  type="button"
                                  className="btn btn-icon btn-small btn-danger"
                                  onClick={() => setRemoveRecord({ record: r, job: null })}
                                  disabled={busyId !== null}
                                  aria-label="Remove payment"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </li>
                            ))}
                          </ul>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="payments-empty">
                    <Banknote size={48} className="payments-empty__icon" aria-hidden="true" />
                    <p>No salary payments recorded yet.</p>
                  </div>
                )
              )}
            </div>
          </>
        )}
      </div>

      {/* Add payment modal */}
      {addModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setAddModalOpen(false)}
          role="presentation"
        >
          <div
            className="modal-content payments-modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-payment-title"
          >
            <div className="modal-header">
              <h2 id="add-payment-title" className="modal-title">
                Add payment
              </h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setAddModalOpen(false)}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
            <div className="payments-toggle">
              <button
                type="button"
                className={`payments-toggle__btn ${paymentType === "job" ? "payments-toggle__btn--active" : ""}`}
                onClick={() => setPaymentType("job")}
              >
                Job
              </button>
              <button
                type="button"
                className={`payments-toggle__btn ${paymentType === "salary" ? "payments-toggle__btn--active" : ""}`}
                onClick={() => setPaymentType("salary")}
              >
                Salary
              </button>
            </div>
            {paymentType === "job" ? (
              <form onSubmit={handleAddPayment} className="payment-form">
                {addError && <div className="form-error">{addError}</div>}
                <label className="form-label">
                  Job *
                  <select
                    value={addForm.jobId}
                    onChange={(e) => {
                      const id = e.target.value;
                      const job = jobs.find((j) => j.id === id);
                      setAddForm((p) => ({
                        ...p,
                        jobId: id,
                        amount: job ? String(getRemaining(job)) : "",
                      }));
                    }}
                    className="form-input"
                    required
                  >
                    <option value="">Select job…</option>
                    {unpaidJobs.map((job) => {
                      const rem = getRemaining(job);
                      return (
                        <option key={job.id} value={job.id}>
                          {job.clientName} – {job.workDescription} (remaining{" "}
                          {formatAmount(rem, job.currency ?? "BDT")})
                        </option>
                      );
                    })}
                  </select>
                </label>
                <label className="form-label">
                  Amount *
                  {addForm.jobId &&
                    (() => {
                      const job = jobs.find((j) => j.id === addForm.jobId);
                      const curr = job?.currency ?? "BDT";
                      return <span className="form-hint">In {curr}</span>;
                    })()}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={addForm.amount}
                    onChange={(e) =>
                      setAddForm((p) => ({ ...p, amount: e.target.value }))
                    }
                    className="form-input"
                    placeholder="0"
                    required
                  />
                </label>
                <label className="form-label">
                  Note
                  <input
                    type="text"
                    value={addForm.note}
                    onChange={(e) =>
                      setAddForm((p) => ({ ...p, note: e.target.value }))
                    }
                    className="form-input"
                    placeholder="Optional"
                  />
                </label>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setAddModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={busyId === "add"}
                  >
                    {busyId === "add" ? "Adding…" : "Add payment"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddSalaryPayment} className="payment-form">
                {addError && <div className="form-error">{addError}</div>}
                <label className="form-label">
                  Client *
                  <select
                    value={salaryClientId}
                    onChange={(e) => {
                      setSalaryClientId(e.target.value);
                      const client = clients.find((c) => c.id === e.target.value);
                      if (client) {
                        const key = `${client.id}_${salaryMonth}_${salaryYear}`;
                        const existingGroup = salaryGroups.find((g) => g.key === key);
                        const remaining = existingGroup ? existingGroup.remaining : (getMonthlySalaryAmount(client) || 0);
                        setAddForm((p) => ({ ...p, amount: String(remaining) }));
                      }
                    }}
                    className="form-input"
                    required
                  >
                    <option value="">Select client…</option>
                    {clients.filter(hasMonthlySalary).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.clientName} ({formatAmount(getMonthlySalaryAmount(c), getMonthlySalaryCurrency(c))})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-label">
                  Salary month
                  <div className="form-row form-row--gap">
                    <select
                      value={salaryMonth}
                      onChange={(e) => {
                        setSalaryMonth(Number(e.target.value));
                        if (salaryClientId) {
                          const key = `${salaryClientId}_${Number(e.target.value)}_${salaryYear}`;
                          const existingGroup = salaryGroups.find((g) => g.key === key);
                          const client = clients.find((c) => c.id === salaryClientId);
                          const remaining = existingGroup ? existingGroup.remaining : (getMonthlySalaryAmount(client) || 0);
                          setAddForm((p) => ({ ...p, amount: String(remaining) }));
                        }
                      }}
                      className="form-input"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          {new Date(2024, m - 1).toLocaleString("en-US", { month: "long" })}
                        </option>
                      ))}
                    </select>
                    <select
                      value={salaryYear}
                      onChange={(e) => {
                        setSalaryYear(Number(e.target.value));
                        if (salaryClientId) {
                          const key = `${salaryClientId}_${salaryMonth}_${Number(e.target.value)}`;
                          const existingGroup = salaryGroups.find((g) => g.key === key);
                          const client = clients.find((c) => c.id === salaryClientId);
                          const remaining = existingGroup ? existingGroup.remaining : (getMonthlySalaryAmount(client) || 0);
                          setAddForm((p) => ({ ...p, amount: String(remaining) }));
                        }
                      }}
                      className="form-input"
                    >
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </label>
                {salaryClientId && (() => {
                  const client = clients.find((c) => c.id === salaryClientId);
                  const amt = getMonthlySalaryAmount(client);
                  const curr = getMonthlySalaryCurrency(client);
                  const key = `${salaryClientId}_${salaryMonth}_${salaryYear}`;
                  const existingGroup = salaryGroups.find((g) => g.key === key);
                  const paidSoFar = existingGroup?.totalPaid || 0;
                  return amt ? (
                    <div className="form-hint" style={{ marginBottom: "1rem" }}>
                      Monthly salary: <strong>{formatAmount(amt, curr)}</strong>
                      {paidSoFar > 0 && (
                        <> · Paid so far: <strong>{formatAmount(paidSoFar, curr)}</strong></>
                      )}
                      {paidSoFar < amt && (
                        <> · Remaining: <strong>{formatAmount(amt - paidSoFar, curr)}</strong></>
                      )}
                    </div>
                  ) : null;
                })()}
                <label className="form-label">
                  Amount *
                  {salaryClientId && (() => {
                    const client = clients.find((c) => c.id === salaryClientId);
                    return <span className="form-hint">In {getMonthlySalaryCurrency(client) || "BDT"}</span>;
                  })()}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={addForm.amount}
                    onChange={(e) =>
                      setAddForm((p) => ({ ...p, amount: e.target.value }))
                    }
                    className="form-input"
                    placeholder="0"
                    required
                  />
                </label>
                <label className="form-label">
                  Note
                  <input
                    type="text"
                    value={addForm.note}
                    onChange={(e) =>
                      setAddForm((p) => ({ ...p, note: e.target.value }))
                    }
                    className="form-input"
                    placeholder="Optional"
                  />
                </label>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setAddModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={busyId === "add" || !salaryClientId}
                  >
                    {busyId === "add" ? "Adding…" : "Add payment"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!removeRecord}
        title="Remove payment?"
        message={
          removeRecord
            ? removeRecord.record.isSalaryPayment
              ? `Remove salary payment of ${formatAmount(removeRecord.record.amount)}?`
              : `Remove ${formatAmount(removeRecord.record.amount, removeRecord.job?.currency ?? "BDT")} from "${removeRecord.job?.workDescription}"?${removeRecord.job?.status === "Paid" ? " Job will move back to Delivered." : ""}`
            : ""
        }
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() =>
          removeRecord &&
          handleDeleteRecord(removeRecord.record, removeRecord.job)
        }
        onClose={() => setRemoveRecord(null)}
      />
    </div>
  );
}

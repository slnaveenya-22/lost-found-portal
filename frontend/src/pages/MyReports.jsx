import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Button from "../components/Button";
import StatusPill from "../components/StatusPill";
import TypeBadge from "../components/TypeBadge";
import EmptyState from "../components/EmptyState";

const STATUS_TABS = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Matched", value: "Matched" },
  { label: "Returned", value: "Returned" },
  { label: "Removed", value: "Removed" },
];

const TYPE_TABS = [
  { label: "All", value: "all" },
  { label: "Lost", value: "lost" },
  { label: "Found", value: "found" },
];

const ACTIVE_STATUSES = ["Posted", "Matched", "Verified"];

export default function MyReports() {
  const navigate = useNavigate();

  const [reports, setReports] = useState([]);
  const [statusTab, setStatusTab] = useState("all");
  const [typeTab, setTypeTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removeTarget, setRemoveTarget] = useState(null);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  // ── Redirect guests ─────────────────────────────────────────
  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);

  // ── Fetch user's reports ────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const controller = new AbortController();

    async function fetchReports() {
      setLoading(true);
      setError("");
      try {
        const headers = {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        };

        const [lostRes, foundRes] = await Promise.allSettled([
          axios.get("http://localhost:5000/api/items/lost", {
            params: { user_id: user.id },
            headers,
            signal: controller.signal,
          }),
          axios.get("http://localhost:5000/api/items/found", {
            params: { user_id: user.id },
            headers,
            signal: controller.signal,
          }),
        ]);

        if (cancelled) return;

        const lost =
          lostRes.status === "fulfilled"
            ? (lostRes.value.data.items || lostRes.value.data || []).map((i) => ({
                ...i,
                type: "lost",
              }))
            : [];

        const found =
          foundRes.status === "fulfilled"
            ? (foundRes.value.data.items || foundRes.value.data || []).map((i) => ({
                ...i,
                type: "found",
              }))
            : [];

        // Merge + sort by created_at desc
        const merged = [...lost, ...found].sort(
          (a, b) =>
            new Date(b.created_at || b.date_time) -
            new Date(a.created_at || a.date_time)
        );

        setReports(merged);

        // If both failed, surface a soft error
        if (
          lostRes.status === "rejected" &&
          foundRes.status === "rejected"
        ) {
          setError("Couldn't load your reports. Please refresh.");
        }
      } catch (err) {
        if (axios.isCancel(err) || cancelled) return;
        setError(err.response?.data?.error || "Couldn't load your reports.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchReports();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [user]);

  // ── Derived ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (typeTab !== "all" && r.type !== typeTab) return false;
      if (statusTab === "all") return true;
      if (statusTab === "active") return ACTIVE_STATUSES.includes(r.status);
      return r.status === statusTab;
    });
  }, [reports, statusTab, typeTab]);

  const counts = useMemo(() => {
    const byType = (t) =>
      reports.filter((r) => (t === "all" ? true : r.type === t));
    return {
      all: byType("all").length,
      lost: byType("lost").length,
      found: byType("found").length,
    };
  }, [reports]);

  const statusCounts = useMemo(() => {
    const scoped = reports.filter((r) =>
      typeTab === "all" ? true : r.type === typeTab
    );
    return {
      all: scoped.length,
      active: scoped.filter((r) => ACTIVE_STATUSES.includes(r.status)).length,
      Matched: scoped.filter((r) => r.status === "Matched").length,
      Returned: scoped.filter((r) => r.status === "Returned").length,
      Removed: scoped.filter((r) => r.status === "Removed").length,
    };
  }, [reports, typeTab]);

  // ── Remove (Story 11) ───────────────────────────────────────
  const confirmRemove = async () => {
    if (!removeTarget) return;
    const { type, report_id } = removeTarget;

    // Optimistic
    const snapshot = reports;
    setReports((prev) =>
      prev.map((r) =>
        r.report_id === report_id ? { ...r, status: "Removed" } : r
      )
    );
    setRemoveTarget(null);

    try {
      await axios.patch(
        `http://localhost:5000/api/items/${type}/${report_id}`,
        { status: "Removed" },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
    } catch (err) {
      setReports(snapshot);
      alert(err.response?.data?.error || "Failed to remove. Please try again.");
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            My Reports
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Everything you've reported on campus.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate("/report-found")}
          >
            ➕ Report Found
          </Button>
          <Button
            variant="accent"
            onClick={() => navigate("/report-lost")}
          >
            ➕ Report Lost
          </Button>
        </div>
      </div>

      {/* ── Type toggle ────────────────────────────────────── */}
      <div className="mb-4 flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 w-fit">
        {TYPE_TABS.map((t) => {
          const active = typeTab === t.value;
          const count = counts[t.value];
          return (
            <button
              key={t.value}
              onClick={() => setTypeTab(t.value)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors
                ${
                  active
                    ? "bg-brand-primary text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
            >
              {t.label}
              <span
                className={`ml-2 text-xs ${active ? "opacity-80" : "text-slate-400"}`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Status tabs ────────────────────────────────────── */}
      <div className="mb-4 flex items-center gap-1 overflow-x-auto">
        {STATUS_TABS.map((t) => {
          const active = statusTab === t.value;
          const count = statusCounts[t.value];
          return (
            <button
              key={t.value}
              onClick={() => setStatusTab(t.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                ${
                  active
                    ? "bg-brand-accent-soft text-brand-primary"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
            >
              {t.label}
              {count > 0 && (
                <span
                  className={`ml-1.5 text-xs ${
                    active ? "text-brand-primary/70" : "text-slate-400"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Error ──────────────────────────────────────────── */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
          {error}
        </div>
      )}

      {/* ── List ───────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading && <ListSkeleton />}

        {!loading && filtered.length === 0 && (
          <EmptyState
            icon={reports.length === 0 ? "📭" : "🔍"}
            title={
              reports.length === 0
                ? "You haven't reported anything yet"
                : "No reports match these filters"
            }
            message={
              reports.length === 0
                ? "Report a lost or found item and it'll show up here."
                : "Try a different tab or clear the filters."
            }
            action={
              reports.length === 0 ? (
                <Button
                  variant="accent"
                  onClick={() => navigate("/report-lost")}
                >
                  ➕ Report your first item
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setStatusTab("all");
                    setTypeTab("all");
                  }}
                >
                  Clear filters
                </Button>
              )
            }
          />
        )}

        {!loading && filtered.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {filtered.map((r) => (
              <ReportRow
                key={`${r.type}-${r.report_id}`}
                report={r}
                onView={() => navigate(`/items/${r.type}/${r.report_id}`)}
                onEdit={() =>
                  navigate(
                    r.type === "lost"
                      ? `/report-lost?edit=${r.report_id}`
                      : `/report-found?edit=${r.report_id}`
                  )
                }
                onRemove={() => setRemoveTarget(r)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* ── Confirm remove modal ───────────────────────────── */}
      {removeTarget && (
        <ConfirmRemoveModal
          report={removeTarget}
          onCancel={() => setRemoveTarget(null)}
          onConfirm={confirmRemove}
        />
      )}
    </div>
  );
}

/* ═══════════════ Sub-components ═══════════════ */

function ReportRow({ report, onView, onEdit, onRemove }) {
  const { type, status, report_id, item_name, category, location, date_time, image_url } =
    report;

  const image = image_url ? `http://localhost:5000${image_url}` : null;
  const canEdit = status !== "Returned" && status !== "Removed";

  return (
    <li className="flex items-center gap-4 px-4 sm:px-5 py-4 hover:bg-slate-50 transition-colors">
      {/* Thumbnail */}
      <button
        onClick={onView}
        className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 shrink-0"
      >
        {image ? (
          <img src={image} alt={item_name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl text-slate-300">
            📦
          </div>
        )}
      </button>

      {/* Meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onView}
            className="text-sm font-semibold text-slate-900 truncate hover:text-brand-accent text-left"
          >
            {item_name}
          </button>
          <TypeBadge type={type} />
          <StatusPill status={status} />
        </div>
        <p className="mt-1 text-xs text-slate-500 truncate">
          🏷 {category || "—"} · 📍 {location || "—"} · 🕒 {formatDate(date_time)}
        </p>
        <p className="mt-0.5 text-xs text-slate-400 font-mono">{report_id}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <Button size="sm" variant="ghost" onClick={onView}>
          View
        </Button>
        {canEdit && (
          <>
            <Button size="sm" variant="ghost" onClick={onEdit}>
              Edit
            </Button>
            <Button size="sm" variant="ghost" onClick={onRemove}
              className="!text-red-600 hover:!bg-red-50">
              Remove
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

function ConfirmRemoveModal({ report, onCancel, onConfirm }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-md mx-4 rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-slate-900">
          Remove this report?
        </h3>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          "{report.item_name}" ({report.report_id}) will be marked as removed
          and hidden from browse. You won't be able to undo this yourself — an
          admin can restore it if needed.
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Yes, remove
          </Button>
        </div>
      </div>
    </div>
  );
}

function ListSkeleton() {
  return (
    <ul className="divide-y divide-slate-100">
      {Array.from({ length: 5 }).map((_, i) => (
        <li
          key={i}
          className="flex items-center gap-4 px-5 py-4 animate-pulse"
        >
          <div className="w-16 h-16 rounded-lg bg-slate-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 bg-slate-200 rounded" />
            <div className="h-3 w-2/3 bg-slate-100 rounded" />
            <div className="h-3 w-24 bg-slate-100 rounded" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ═══════════════ Utilities ═══════════════ */

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return value;
  }
}
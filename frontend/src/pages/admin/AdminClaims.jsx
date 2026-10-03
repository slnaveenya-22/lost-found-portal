import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import StatusPill from "../../components/StatusPill";

const TABS = [
  { label: "Pending", value: "Pending" },
  { label: "Approved", value: "Approved" },
  { label: "Rejected", value: "Rejected" },
];

export default function AdminClaims() {
  const navigate = useNavigate();
  const [claims, setClaims] = useState([]);
  const [tab, setTab] = useState("Pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rejectTarget, setRejectTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!user) return navigate("/login", { replace: true });
    if (user.role !== "admin") return navigate("/browse/lost", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get("http://localhost:5000/api/admin/claims", {
          params: { status: tab },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          signal: controller.signal,
        });
        if (!cancelled) setClaims(res.data.items || res.data.claims || []);
      } catch (err) {
        if (axios.isCancel(err) || cancelled) return;
        if (err.response?.status === 404) setClaims([]);
        else
          setError(
            err.response?.data?.error || "Couldn't load claims."
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [user, tab]);

  const decide = async (claim, action, reason) => {
    setBusyId(claim.id);
    const snapshot = claims;
    // Optimistic — remove from Pending list
    if (tab === "Pending") {
      setClaims((prev) => prev.filter((c) => c.id !== claim.id));
    } else {
      setClaims((prev) =>
        prev.map((c) =>
          c.id === claim.id
            ? { ...c, status: action === "approve" ? "Approved" : "Rejected" }
            : c
        )
      );
    }
    setRejectTarget(null);

    try {
      await axios.patch(
        `http://localhost:5000/api/admin/claims/${claim.id}`,
        { action, rejection_reason: reason || null },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
    } catch (err) {
      setClaims(snapshot);
      alert(err.response?.data?.error || "Failed to update claim.");
    } finally {
      setBusyId(null);
    }
  };

  if (!user || user.role !== "admin") return null;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Claim Verification
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Review claimant proofs and approve or reject.
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-1 border-b border-slate-200">
        {TABS.map((t) => {
          const active = tab === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors
                ${
                  active
                    ? "border-brand-accent text-brand-primary"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading && <ClaimsSkeleton />}

        {!loading && claims.length === 0 && (
          <EmptyState
            icon={tab === "Pending" ? "🎉" : "📭"}
            title={
              tab === "Pending"
                ? "No pending claims"
                : `No ${tab.toLowerCase()} claims`
            }
            message={
              tab === "Pending"
                ? "All caught up. New claims will appear here."
                : "Nothing to show in this tab."
            }
          />
        )}

        {!loading && claims.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {claims.map((claim) => (
              <ClaimRow
                key={claim.id}
                claim={claim}
                tab={tab}
                busy={busyId === claim.id}
                onView={() => navigate(`/items/found/${claim.item_report_id}`)}
                onApprove={() => decide(claim, "approve")}
                onReject={() => setRejectTarget(claim)}
              />
            ))}
          </ul>
        )}
      </div>

      {rejectTarget && (
        <RejectModal
          claim={rejectTarget}
          onCancel={() => setRejectTarget(null)}
          onConfirm={(reason) => decide(rejectTarget, "reject", reason)}
        />
      )}
    </div>
  );
}

function ClaimRow({ claim, tab, busy, onView, onApprove, onReject }) {
  const {
    item_name,
    item_report_id,
    claimant_name,
    claimant_email,
    proof_text,
    created_at,
    status,
  } = claim;

  return (
    <li className="px-5 py-4">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center text-xl shrink-0">
          📨
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onView}
              className="text-sm font-semibold text-slate-900 hover:text-brand-accent text-left"
            >
              {item_name || "Found item"}
            </button>
            <StatusPill status={status || tab} />
          </div>

          <p className="mt-1 text-xs text-slate-500">
            Claimed by <span className="font-medium text-slate-700">{claimant_name || "Unknown"}</span>
            {claimant_email && <> · {claimant_email}</>}
            {item_report_id && <> · <span className="font-mono">{item_report_id}</span></>}
          </p>

          {proof_text && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
                Claimant's proof
              </p>
              <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed break-words">
                {proof_text}
              </p>
            </div>
          )}

          <p className="mt-2 text-xs text-slate-400">
            Submitted {formatDate(created_at)}
          </p>
        </div>

        {tab === "Pending" && (
          <div className="flex flex-col gap-2 shrink-0">
            <Button
              size="sm"
              variant="primary"
              onClick={onApprove}
              disabled={busy}
            >
              {busy ? "…" : "✓ Approve"}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={onReject}
              disabled={busy}
              className="!text-red-600 hover:!bg-red-50"
            >
              ✕ Reject
            </Button>
          </div>
        )}
      </div>
    </li>
  );
}

function RejectModal({ claim, onCancel, onConfirm }) {
  const [reason, setReason] = useState("");

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
          Reject this claim?
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          Optionally provide a reason — it will be sent to the claimant.
        </p>

        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="e.g. Proof doesn't match the reported item."
          className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
        />

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => onConfirm(reason)}>
            Reject claim
          </Button>
        </div>
      </div>
    </div>
  );
}

function ClaimsSkeleton() {
  return (
    <ul className="divide-y divide-slate-100">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="px-5 py-4 flex items-start gap-4 animate-pulse">
          <div className="w-12 h-12 rounded-lg bg-slate-200" />
          <div className="flex-1 space-y-3">
            <div className="h-4 w-1/3 bg-slate-200 rounded" />
            <div className="h-3 w-2/3 bg-slate-100 rounded" />
            <div className="h-16 w-full bg-slate-100 rounded-lg" />
          </div>
        </li>
      ))}
    </ul>
  );
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";

const TABS = [
  { label: "All", value: "all" },
  { label: "Pending", value: "Pending" },
  { label: "Approved", value: "Approved" },
  { label: "Rejected", value: "Rejected" },
];

const STATUS_STYLES = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Rejected: "bg-red-50 text-red-700 border-red-200",
};

export default function MyClaims() {
  const navigate = useNavigate();
  const [claims, setClaims] = useState([]);
  const [tab, setTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!user) navigate("/login", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get("http://localhost:5000/api/claims/mine", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          signal: controller.signal,
        });
        if (!cancelled) setClaims(res.data.items || []);
      } catch (err) {
        if (axios.isCancel(err) || cancelled) return;
        setError(err.response?.data?.error || "Couldn't load your claims.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [user]);

  const filtered = useMemo(() => {
    if (tab === "all") return claims;
    return claims.filter((c) => c.status === tab);
  }, [claims, tab]);

  const counts = useMemo(() => {
    return {
      all: claims.length,
      Pending: claims.filter((c) => c.status === "Pending").length,
      Approved: claims.filter((c) => c.status === "Approved").length,
      Rejected: claims.filter((c) => c.status === "Rejected").length,
    };
  }, [claims]);

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            My Claims
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Claims you've submitted on found items.
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate("/browse/found")}>
          Browse found items
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex items-center gap-1 overflow-x-auto">
        {TABS.map((t) => {
          const active = tab === t.value;
          const count = counts[t.value];
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
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

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
          {error}
        </div>
      )}

      {/* List */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading && <ClaimsSkeleton />}

        {!loading && filtered.length === 0 && (
          <EmptyState
            icon={claims.length === 0 ? "📋" : "🔍"}
            title={
              claims.length === 0
                ? "You haven't raised any claims yet"
                : "No claims match this filter"
            }
            message={
              claims.length === 0
                ? "Found something that's yours? Browse found items and raise a claim."
                : "Try a different tab."
            }
            action={
              claims.length === 0 ? (
                <Button variant="accent" onClick={() => navigate("/browse/found")}>
                  Browse found items
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => setTab("all")}>
                  View all
                </Button>
              )
            }
          />
        )}

        {!loading && filtered.length > 0 && (
          <ul className="divide-y divide-slate-100">
            {filtered.map((c) => (
              <ClaimRow
                key={c.id}
                claim={c}
                onClick={() =>
                  navigate(`/items/found/${c.found_report_id}`)
                }
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ClaimRow({ claim, onClick }) {
  const {
    status,
    created_at,
    rejection_reason,
    found_report_id,
    found_item_name,
    found_item_image_url,
  } = claim;

  const image = found_item_image_url
    ? `http://localhost:5000${found_item_image_url}`
    : null;

  return (
    <li>
      <button
        onClick={onClick}
        className="w-full flex items-start gap-4 px-5 py-4 hover:bg-slate-50 text-left transition-colors"
      >
        {/* Thumbnail */}
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 shrink-0">
          {image ? (
            <img
              src={image}
              alt={found_item_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl text-slate-300">
              📦
            </div>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-slate-900 truncate">
              {found_item_name}
            </p>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                STATUS_STYLES[status] || STATUS_STYLES.Pending
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {status}
            </span>
          </div>

          <p className="mt-1 text-xs text-slate-500 font-mono">
            {found_report_id}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Submitted {formatDate(created_at)}
          </p>

          {status === "Rejected" && rejection_reason && (
            <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1.5 inline-block">
              {rejection_reason}
            </p>
          )}
        </div>

        <span className="text-slate-300 mt-4">→</span>
      </button>
    </li>
  );
}

function ClaimsSkeleton() {
  return (
    <ul className="divide-y divide-slate-100">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="flex items-start gap-4 px-5 py-4 animate-pulse">
          <div className="w-16 h-16 rounded-lg bg-slate-200 shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 w-1/3 bg-slate-200 rounded" />
            <div className="h-3 w-24 bg-slate-100 rounded" />
            <div className="h-3 w-32 bg-slate-100 rounded" />
          </div>
        </li>
      ))}
    </ul>
  );
}

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
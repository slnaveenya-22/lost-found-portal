import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Button from "../components/Button";
import StatusPill from "../components/StatusPill";
import TypeBadge from "../components/TypeBadge";
import EmptyState from "../components/EmptyState";

export default function Dashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  // ── Fetch dashboard data ────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const controller = new AbortController();

    async function fetchDashboard() {
      setLoading(true);
      setError("");
      try {
        const headers = {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        };

        // Two parallel requests — stats + recent activity
        const [statsRes, activityRes] = await Promise.allSettled([
          axios.get("http://localhost:5000/api/dashboard/stats", {
            headers,
            signal: controller.signal,
          }),
          axios.get("http://localhost:5000/api/dashboard/activity", {
            params: { limit: 10 },
            headers,
            signal: controller.signal,
          }),
        ]);

        if (cancelled) return;

        // ── Stats: fall back to zeros if endpoint doesn't exist yet ──
        if (statsRes.status === "fulfilled") {
          setStats(statsRes.value.data.stats || statsRes.value.data);
        } else {
          setStats({
            active_reports: 0,
            matches: 0,
            pending_claims: 0,
            returned: 0,
          });
        }

        // ── Activity: fall back to empty ─────────────────────────────
        if (activityRes.status === "fulfilled") {
          setActivity(
            activityRes.value.data.items ||
              activityRes.value.data.activity ||
              []
          );
        } else {
          setActivity([]);
        }
      } catch (err) {
        if (axios.isCancel(err) || cancelled) return;
        setError(err.response?.data?.error || "Couldn't load dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchDashboard();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [user]);

  if (!user) return null;

  return (
    <div className="max-w-7xl mx-auto">
      {/* ── Greeting header ────────────────────────────────── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Hey, {user.name?.split(" ")[0] || "there"} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Here's what's happening with your reports.
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

      {/* ── Error banner (soft — dashboard still renders) ─── */}
      {error && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 p-3 text-sm">
          {error} — some sections may be empty.
        </div>
      )}

      {/* ══ Stat cards ═══════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          loading={loading}
          icon="📋"
          label="Active Reports"
          value={stats?.active_reports}
          hint="Items you've reported that aren't returned yet"
          tone="slate"
        />
        <StatCard
          loading={loading}
          icon="🎯"
          label="Matches"
          value={stats?.matches}
          hint="Potential matches with other reports"
          tone="indigo"
        />
        <StatCard
          loading={loading}
          icon="⏳"
          label="Pending Claims"
          value={stats?.pending_claims}
          hint="Claims awaiting review"
          tone="amber"
        />
        <StatCard
          loading={loading}
          icon="✅"
          label="Returned"
          value={stats?.returned}
          hint="Items successfully returned"
          tone="emerald"
        />
      </div>

      {/* ══ Main grid: activity + quick actions ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Activity feed (2/3) ──────────────────────────── */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-sm font-semibold text-slate-900">
                Recent activity
              </h2>
              <Link
                to="/my-reports"
                className="text-xs text-brand-accent hover:underline"
              >
                View all
              </Link>
            </div>

            <div className="p-2">
              {loading && <ActivitySkeleton />}

              {!loading && activity.length === 0 && (
                <EmptyState
                  icon="🌱"
                  title="No activity yet"
                  message="When you report items or receive matches, they'll show up here."
                  action={
                    <Button
                      variant="accent"
                      size="sm"
                      onClick={() => navigate("/report-lost")}
                    >
                      Report your first item
                    </Button>
                  }
                />
              )}

              {!loading &&
                activity.map((entry, i) => (
                  <ActivityRow key={entry.id || i} entry={entry} navigate={navigate} />
                ))}
            </div>
          </div>
        </div>

        {/* ── Quick actions + tips (1/3) ───────────────────── */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">
              Quick actions
            </h2>
            <div className="space-y-2">
              <QuickAction
                icon="🔍"
                label="Browse lost items"
                onClick={() => navigate("/browse/lost")}
              />
              <QuickAction
                icon="📦"
                label="Browse found items"
                onClick={() => navigate("/browse/found")}
              />
              <QuickAction
                icon="📄"
                label="My reports"
                onClick={() => navigate("/my-reports")}
              />
              <QuickAction
                icon="🔔"
                label="Notifications"
                onClick={() => navigate("/notifications")}
              />
            </div>
          </div>

          {/* Match-magic tip — reinforces Story 7 value */}
          <div className="rounded-xl border border-brand-accent-soft bg-brand-accent-soft/50 p-5">
            <h3 className="text-xs font-semibold text-brand-primary mb-2">
              🎯 How matching works
            </h3>
            <p className="text-xs text-brand-primary/80 leading-relaxed">
              Every time someone reports an item, we compare it with existing
              reports. If we spot a likely match, we'll notify you here.
            </p>
            <Link
              to="/browse/found"
              className="mt-3 inline-block text-xs font-medium text-brand-accent hover:underline"
            >
              Check found items →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ═══════════════ Sub-components ═══════════════ */

const TONES = {
  slate: "bg-slate-100 text-slate-600",
  indigo: "bg-indigo-100 text-indigo-600",
  amber: "bg-amber-100 text-amber-600",
  emerald: "bg-emerald-100 text-emerald-600",
};

function StatCard({ loading, icon, label, value, hint, tone = "slate" }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${TONES[tone]}`}>
          {icon}
        </div>
      </div>

      <p className="mt-4 text-xs uppercase tracking-wide text-slate-400">
        {label}
      </p>

      {loading ? (
        <div className="h-8 w-12 bg-slate-200 rounded animate-pulse mt-1" />
      ) : (
        <p className="mt-1 text-2xl font-bold text-slate-900">
          {value ?? 0}
        </p>
      )}

      {hint && (
        <p className="mt-1 text-xs text-slate-400 leading-snug">{hint}</p>
      )}
    </div>
  );
}

function QuickAction({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm
        text-slate-700 hover:bg-slate-50 hover:text-brand-primary transition-colors text-left"
    >
      <span className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-base">
        {icon}
      </span>
      <span className="font-medium flex-1">{label}</span>
      <span className="text-slate-300">→</span>
    </button>
  );
}

function ActivityRow({ entry, navigate }) {
  const {
    kind,
    item_name,
    report_id,
    type,
    status,
    actor_name,
    created_at,
  } = entry;

  // Fallback mapping for various activity kinds
  const meta = activityMeta(kind);

  const handleClick = () => {
    if (report_id && type) {
      navigate(`/items/${type}/${report_id}`);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={!report_id}
      className="w-full flex items-start gap-3 rounded-lg px-4 py-3 text-left
        hover:bg-slate-50 transition-colors disabled:cursor-default disabled:hover:bg-transparent"
    >
      <span className={`w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0 ${meta.tone}`}>
        {meta.icon}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-800 leading-snug break-words">
          <span className="font-medium">{meta.verb}</span>
          {item_name && (
            <>
              {" "}
              <span className="font-medium text-slate-900">{item_name}</span>
            </>
          )}
          {actor_name && <> by {actor_name}</>}
        </p>
        <div className="mt-1 flex items-center gap-2 flex-wrap">
          {type && <TypeBadge type={type} />}
          {status && <StatusPill status={status} />}
          {created_at && (
            <span className="text-xs text-slate-400">
              {timeAgo(created_at)}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function activityMeta(kind) {
  switch (kind) {
    case "match_suggested":
      return {
        icon: "🎯",
        verb: "Possible match for",
        tone: "bg-indigo-100 text-indigo-600",
      };
    case "claim_submitted":
      return {
        icon: "📨",
        verb: "New claim on",
        tone: "bg-amber-100 text-amber-600",
      };
    case "claim_approved":
      return {
        icon: "✅",
        verb: "Claim approved on",
        tone: "bg-emerald-100 text-emerald-600",
      };
    case "claim_rejected":
      return {
        icon: "❌",
        verb: "Claim rejected on",
        tone: "bg-red-100 text-red-600",
      };
    case "item_returned":
      return {
        icon: "🎉",
        verb: "Item returned —",
        tone: "bg-emerald-100 text-emerald-600",
      };
    case "report_created":
    default:
      return {
        icon: "📝",
        verb: "You reported",
        tone: "bg-slate-100 text-slate-600",
      };
  }
}

function ActivitySkeleton() {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3 animate-pulse">
          <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-3 w-3/4 bg-slate-200 rounded" />
            <div className="h-3 w-1/3 bg-slate-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════ Utilities ═══════════════ */

function timeAgo(value) {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
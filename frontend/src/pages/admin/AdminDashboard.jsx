import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Button from "../../components/Button";
import StatusPill from "../../components/StatusPill";
import TypeBadge from "../../components/TypeBadge";
import EmptyState from "../../components/EmptyState";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentItems, setRecentItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }
    if (user.role !== "admin") {
      navigate("/browse/lost", { replace: true });
      return;
    }
  }, [user, navigate]);

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    let cancelled = false;
    const controller = new AbortController();
    const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };

    async function load() {
      setLoading(true);
      const [statsRes, itemsRes] = await Promise.allSettled([
        axios.get("http://localhost:5000/api/admin/stats", {
          headers,
          signal: controller.signal,
        }),
        axios.get("http://localhost:5000/api/admin/items", {
          params: { limit: 8, sort: "recent" },
          headers,
          signal: controller.signal,
        }),
      ]);
      if (cancelled) return;

      setStats(
        statsRes.status === "fulfilled"
          ? statsRes.value.data.stats || statsRes.value.data
          : {
              total_users: 0,
              total_items: 0,
              pending_claims: 0,
              returned_items: 0,
            }
      );

      setRecentItems(
        itemsRes.status === "fulfilled"
          ? itemsRes.value.data.items || []
          : []
      );
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [user]);

  if (!user || user.role !== "admin") return null;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Admin Dashboard
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Platform overview and recent activity.
        </p>
      </div>

      {/* ── Platform stats ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          loading={loading}
          icon="👥"
          label="Total Users"
          value={stats?.total_users}
          tone="bg-slate-100 text-slate-600"
        />
        <StatCard
          loading={loading}
          icon="📦"
          label="Total Items"
          value={stats?.total_items}
          tone="bg-indigo-100 text-indigo-600"
        />
        <StatCard
          loading={loading}
          icon="⏳"
          label="Pending Claims"
          value={stats?.pending_claims}
          tone="bg-amber-100 text-amber-600"
          cta={
            (stats?.pending_claims ?? 0) > 0
              ? { label: "Review →", to: "/admin/claims" }
              : null
          }
        />
        <StatCard
          loading={loading}
          icon="✅"
          label="Items Returned"
          value={stats?.returned_items}
          tone="bg-emerald-100 text-emerald-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Recent items ─────────────────────────────────── */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h2 className="text-sm font-semibold text-slate-900">
              Recent reports
            </h2>
            <Link
              to="/admin/items"
              className="text-xs text-brand-accent hover:underline"
            >
              View all →
            </Link>
          </div>

          {loading ? (
            <RowsSkeleton rows={5} />
          ) : recentItems.length === 0 ? (
            <EmptyState
              icon="📭"
              title="No reports yet"
              message="New reports will appear here as students post them."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentItems.map((item) => (
                <li key={`${item.type}-${item.report_id}`}>
                  <button
                    onClick={() =>
                      navigate(`/items/${item.type}/${item.report_id}`)
                    }
                    className="w-full flex items-center gap-4 px-5 py-3 hover:bg-slate-50 text-left"
                  >
                    <div className="w-12 h-12 rounded-lg bg-slate-100 shrink-0 overflow-hidden">
                      {item.image_url ? (
                        <img
                          src={`http://localhost:5000${item.image_url}`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          📦
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {item.item_name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {item.category} · {item.location}
                      </p>
                    </div>
                    <TypeBadge type={item.type} />
                    <StatusPill status={item.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Admin shortcuts ──────────────────────────────── */}
        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4">
              Manage
            </h2>
            <div className="space-y-2">
              <Shortcut
                icon="✅"
                label="Claims queue"
                badge={stats?.pending_claims}
                onClick={() => navigate("/admin/claims")}
              />
              <Shortcut
                icon="📦"
                label="All items"
                onClick={() => navigate("/admin/items")}
              />
              <Shortcut
                icon="👥"
                label="Users"
                onClick={() => navigate("/admin/users")}
              />
            </div>
          </div>

          <div className="rounded-xl border border-brand-accent-soft bg-brand-accent-soft/50 p-5">
            <h3 className="text-xs font-semibold text-brand-primary mb-2">
              ⚠️ Moderation reminder
            </h3>
            <p className="text-xs text-brand-primary/80 leading-relaxed">
              Review pending claims within 48 hours. Unreviewed claims block
              item returns.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatCard({ loading, icon, label, value, tone, cta }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${tone}`}
      >
        {icon}
      </div>
      <p className="mt-4 text-xs uppercase tracking-wide text-slate-400">
        {label}
      </p>
      {loading ? (
        <div className="h-8 w-12 bg-slate-200 rounded animate-pulse mt-1" />
      ) : (
        <p className="mt-1 text-2xl font-bold text-slate-900">{value ?? 0}</p>
      )}
      {cta && !loading && (
        <Link
          to={cta.to}
          className="mt-1 inline-block text-xs text-brand-accent hover:underline"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}

function Shortcut({ icon, label, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm
        text-slate-700 hover:bg-slate-50 hover:text-brand-primary transition-colors text-left"
    >
      <span className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center">
        {icon}
      </span>
      <span className="flex-1 font-medium">{label}</span>
      {badge > 0 && (
        <span className="text-xs rounded-full bg-brand-accent text-white px-2 py-0.5">
          {badge}
        </span>
      )}
      <span className="text-slate-300">→</span>
    </button>
  );
}

function RowsSkeleton({ rows = 4 }) {
  return (
    <ul className="divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center gap-4 px-5 py-3 animate-pulse">
          <div className="w-12 h-12 bg-slate-200 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/2 bg-slate-200 rounded" />
            <div className="h-3 w-1/3 bg-slate-100 rounded" />
          </div>
        </li>
      ))}
    </ul>
  );
}
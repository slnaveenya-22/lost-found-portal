import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Button from "../../components/Button";
import EmptyState from "../../components/EmptyState";
import StatusPill from "../../components/StatusPill";
import TypeBadge from "../../components/TypeBadge";

const STATUS_TABS = ["All", "Posted", "Matched", "Verified", "Returned", "Removed"];
const TYPE_TABS = ["All", "lost", "found"];

export default function AdminItems() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [statusTab, setStatusTab] = useState("All");
  const [typeTab, setTypeTab] = useState("All");
  const [keyword, setKeyword] = useState("");
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
        const params = {};
        if (statusTab !== "All") params.status = statusTab;
        if (typeTab !== "All") params.type = typeTab;
        if (keyword.trim()) params.q = keyword.trim();

        const res = await axios.get("http://localhost:5000/api/admin/items", {
          params,
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          signal: controller.signal,
        });
        if (!cancelled) setItems(res.data.items || []);
      } catch (err) {
        if (axios.isCancel(err) || cancelled) return;
        if (err.response?.status === 404) setItems([]);
        else setError(err.response?.data?.error || "Couldn't load items.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    const t = setTimeout(load, 250);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(t);
    };
  }, [user, statusTab, typeTab, keyword]);

  if (!user || user.role !== "admin") return null;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Manage Items
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Browse, filter, and moderate every reported item.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col lg:flex-row lg:items-center gap-3">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="Search item, brand, location…"
          className="w-full lg:max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm
            focus:outline-none focus:ring-2 focus:ring-brand-accent focus:border-brand-accent"
        />

        <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 w-fit">
          {TYPE_TABS.map((t) => {
            const active = typeTab === t;
            return (
              <button
                key={t}
                onClick={() => setTypeTab(t)}
                className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors
                  ${
                    active
                      ? "bg-brand-primary text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
              >
                {t === "All" ? "All types" : t}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1 overflow-x-auto">
          {STATUS_TABS.map((t) => {
            const active = statusTab === t;
            return (
              <button
                key={t}
                onClick={() => setStatusTab(t)}
                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors
                  ${
                    active
                      ? "bg-brand-accent-soft text-brand-primary font-medium"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading && <TableSkeleton />}

        {!loading && items.length === 0 && (
          <EmptyState
            icon="📭"
            title="No items match"
            message="Try clearing filters or searching a different keyword."
          />
        )}

        {!loading && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-medium">Item</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Reported by</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr
                    key={`${item.type}-${item.report_id}`}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-4 py-3">
                      <button
                        onClick={() =>
                          navigate(`/items/${item.type}/${item.report_id}`)
                        }
                        className="text-left"
                      >
                        <p className="font-medium text-slate-900 truncate max-w-[220px]">
                          {item.item_name}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">
                          {item.report_id}
                        </p>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <TypeBadge type={item.type} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {item.reporter_name || `#${item.user_id}`}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {formatDate(item.created_at || item.date_time)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          navigate(`/items/${item.type}/${item.report_id}`)
                        }
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="p-6 space-y-3 animate-pulse">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-4 flex-1 bg-slate-200 rounded" />
          <div className="h-4 w-16 bg-slate-100 rounded" />
          <div className="h-4 w-20 bg-slate-100 rounded" />
          <div className="h-4 w-24 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
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
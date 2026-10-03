import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import ItemCard from "../components/ItemCard";
import EmptyState from "../components/EmptyState";
import Button from "../components/Button";
import FormField, { inputClass } from "../components/FormField";

// Fallback category list — swap with a GET /api/categories when you build it
const CATEGORIES = [
  "Electronics",
  "Bag",
  "ID Card",
  "Books",
  "Clothing",
  "Keys",
  "Wallet",
  "Water Bottle",
  "Other",
];

const DATE_RANGES = [
  { label: "Any time", value: "" },
  { label: "Last 24 hours", value: "1" },
  { label: "Last 7 days", value: "7" },
  { label: "Last 30 days", value: "30" },
];

export default function SearchItems({ type = "lost", title }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Filter state, seeded from URL so links are shareable ─────
  const [keyword, setKeyword] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [dateRange, setDateRange] = useState(searchParams.get("days") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "recent");

  // ── Data state ───────────────────────────────────────────────
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ── Guest detection ──────────────────────────────────────────
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  }, []);
  const isGuest = !user;

  // ── Fetch when filters change ────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function fetchItems() {
      setLoading(true);
      setError("");
      try {
        const params = { type };
        if (keyword.trim()) params.q = keyword.trim();
        if (category) params.category = category;
        if (dateRange) params.days = dateRange;
        if (sort) params.sort = sort;

        const res = await axios.get("http://localhost:5000/api/items/search", {
          params,
          signal: controller.signal,
        });

        if (!cancelled) setItems(res.data.items || res.data || []);
      } catch (err) {
        if (axios.isCancel(err) || cancelled) return;
        setError(
          err.response?.data?.error ||
            "Couldn't load items. Please try again."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    // Debounce keyword typing so we don't hammer the API
    const timer = setTimeout(fetchItems, 300);
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [keyword, category, dateRange, sort, type]);

  // ── Keep URL in sync (shareable filters) ─────────────────────
  useEffect(() => {
    const next = {};
    if (keyword.trim()) next.q = keyword.trim();
    if (category) next.category = category;
    if (dateRange) next.days = dateRange;
    if (sort && sort !== "recent") next.sort = sort;
    setSearchParams(next, { replace: true });
  }, [keyword, category, dateRange, sort, setSearchParams]);

  const clearFilters = () => {
    setKeyword("");
    setCategory("");
    setDateRange("");
    setSort("recent");
  };

  const activeFilterCount =
    (keyword.trim() ? 1 : 0) +
    (category ? 1 : 0) +
    (dateRange ? 1 : 0);

  const pageTitle =
    title || (type === "lost" ? "Lost Items" : "Found Items");

  return (
    <div className="max-w-7xl mx-auto">
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {pageTitle}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {type === "lost"
              ? "Browse items reported missing on campus."
              : "Browse items found and waiting to be claimed."}
          </p>
        </div>

        {!isGuest && (
          <Button
            variant="accent"
            onClick={() =>
              navigate(type === "lost" ? "/report-lost" : "/report-found")
            }
          >
            ➕ Report {type === "lost" ? "Lost" : "Found"} Item
          </Button>
        )}
      </div>

      {/* ── Guest banner ────────────────────────────────────── */}
      {isGuest && (
        <div className="mb-6 rounded-xl border border-brand-accent-soft bg-brand-accent-soft/60 px-4 py-3
          flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-sm text-brand-primary">
            👋 Browsing as a guest. Log in to report items or raise a claim.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => navigate("/register")}>
              Register
            </Button>
            <Button size="sm" variant="primary" onClick={() => navigate("/login")}>
              Log In
            </Button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── Filter rail ────────────────────────────────────── */}
        <aside className="lg:w-64 shrink-0">
          <div className="lg:sticky lg:top-4 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-brand-accent hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            <FormField label="Keyword">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Search item, brand, place…"
                className={inputClass}
              />
            </FormField>

            <FormField label="Category">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
              >
                <option value="">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Date reported">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className={inputClass}
              >
                {DATE_RANGES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </FormField>

            <FormField label="Sort by">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className={inputClass}
              >
                <option value="recent">Most recent</option>
                <option value="oldest">Oldest first</option>
                <option value="name">Item name (A–Z)</option>
              </select>
            </FormField>
          </div>
        </aside>

        {/* ── Results ─────────────────────────────────────────── */}
        <section className="flex-1 min-w-0">
          {/* Result count */}
          {!loading && !error && items.length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="text-sm text-slate-500">
                {items.length} {items.length === 1 ? "item" : "items"} found
              </p>
              {activeFilterCount > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {keyword.trim() && (
                    <FilterChip label={`"${keyword.trim()}"`} onClear={() => setKeyword("")} />
                  )}
                  {category && (
                    <FilterChip label={category} onClear={() => setCategory("")} />
                  )}
                  {dateRange && (
                    <FilterChip
                      label={DATE_RANGES.find((r) => r.value === dateRange)?.label}
                      onClear={() => setDateRange("")}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {loading && <SkeletonGrid />}

          {!loading && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
              <p className="text-sm text-red-700">{error}</p>
              <Button
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={clearFilters}
              >
                Reset filters
              </Button>
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white">
              <EmptyState
                icon={type === "lost" ? "🔍" : "📦"}
                title={
                  activeFilterCount > 0
                    ? "No items match your filters"
                    : `No ${type} items yet`
                }
                message={
                  activeFilterCount > 0
                    ? "Try removing a filter or using a different keyword."
                    : `Be the first to report a ${type} item.`
                }
                action={
                  activeFilterCount > 0 ? (
                    <Button variant="secondary" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : !isGuest ? (
                    <Button
                      variant="accent"
                      onClick={() =>
                        navigate(type === "lost" ? "/report-lost" : "/report-found")
                      }
                    >
                      ➕ Report {type === "lost" ? "Lost" : "Found"} Item
                    </Button>
                  ) : (
                    <Button variant="primary" onClick={() => navigate("/login")}>
                      Log in to report
                    </Button>
                  )
                }
              />
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map((item) => (
                <ItemCard
                  key={item.id || item.report_id}
                  item={{ ...item, type }}
                  onClick={() =>
                    navigate(`/items/${type}/${item.report_id}`)
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

/* ── Small helpers ─────────────────────────────────────────── */

function FilterChip({ label, onClear }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white
      px-2.5 py-1 text-xs text-slate-600">
      {label}
      <button
        onClick={onClear}
        className="text-slate-400 hover:text-slate-700"
        aria-label={`Remove filter ${label}`}
      >
        ✕
      </button>
    </span>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 bg-white overflow-hidden animate-pulse"
        >
          <div className="aspect-video bg-slate-200" />
          <div className="p-4 space-y-2">
            <div className="h-4 w-3/4 bg-slate-200 rounded" />
            <div className="h-3 w-1/2 bg-slate-100 rounded" />
            <div className="h-3 w-2/5 bg-slate-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}